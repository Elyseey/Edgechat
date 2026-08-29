package com.aozorae.edgechat.feature.app

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aozorae.edgechat.core.diagnostics.DiagnosticLog
import com.aozorae.edgechat.core.network.dto.SessionDto
import com.aozorae.edgechat.core.repository.AttachmentRepository
import com.aozorae.edgechat.core.repository.ChatRepository
import com.aozorae.edgechat.core.repository.OutboxRepository
import com.aozorae.edgechat.core.repository.ServerRepository
import com.aozorae.edgechat.core.repository.SessionRepository
import com.aozorae.edgechat.core.realtime.RealtimeCoordinator
import com.aozorae.edgechat.core.session.ServerProfile
import com.aozorae.edgechat.core.session.ServerStore
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.collectLatest

data class AppUiState(
    val server: ServerProfile? = null,
    val session: SessionDto? = null,
    val language: String = "zh-CN",
    val loading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class AppViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val serverStore: ServerStore,
    private val serverRepository: ServerRepository,
    private val sessionRepository: SessionRepository,
    private val chatRepository: ChatRepository,
    private val outboxRepository: OutboxRepository,
    private val attachmentRepository: AttachmentRepository,
    private val diagnostics: DiagnosticLog,
    private val realtime: RealtimeCoordinator,
) : ViewModel() {
    private val loading = MutableStateFlow(true)
    private val error = MutableStateFlow<String?>(null)

    val state: StateFlow<AppUiState> = combine(
        serverStore.server,
        sessionRepository.session,
        serverStore.language,
        loading,
        error,
    ) { server, session, language, busy, failure ->
        AppUiState(server, session, language, busy, failure)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AppUiState())

    init {
        viewModelScope.launch {
            sessionRepository.hasStoredSession.collectLatest { stored ->
                if (!stored && sessionRepository.session.value != null) {
                    realtime.stop()
                    sessionRepository.invalidateLocalSession()
                }
            }
        }
        viewModelScope.launch {
            val restored = sessionRepository.restore()
            if (restored != null) {
                runCatching { chatRepository.bootstrap() }.onFailure { error.value = it.message }
                realtime.start()
            }
            loading.value = false
        }
    }

    fun connect(server: String) = launchAction {
        val hadSession = sessionRepository.session.value != null
        realtime.stop()
        outboxRepository.pauseForServerChange()
        val connection = try {
            serverRepository.connect(server)
        } catch (error: Exception) {
            if (hadSession) {
                outboxRepository.resume()
                realtime.start()
            }
            throw error
        }
        if (connection.serverChanged) {
            sessionRepository.clearSessionState()
        } else if (sessionRepository.session.value != null) {
            outboxRepository.resume()
            realtime.start()
        }
    }

    fun login(username: String, password: String) = launchAction {
        sessionRepository.login(username, password)
        chatRepository.bootstrap()
        realtime.start()
    }

    fun logout() = launchAction {
        realtime.stop()
        outboxRepository.pauseForServerChange()
        sessionRepository.logout()
    }

    fun disconnect() = launchAction {
        realtime.stop()
        outboxRepository.pauseForServerChange()
        serverRepository.disconnect()
        sessionRepository.clearSessionState()
    }

    fun updateProfile(displayName: String) = launchAction {
        sessionRepository.updateProfile(displayName)
    }

    fun updateAvatar(displayName: String, uri: Uri) = launchAction {
        val attachment = attachmentRepository.import(uri)
        require(attachment.type.startsWith("image/")) { "头像必须是图片" }
        sessionRepository.updateAvatar(displayName, attachment)
    }

    fun changePassword(current: String, next: String) = launchAction {
        sessionRepository.changePassword(current, next)
    }

    fun setLanguage(language: String) {
        viewModelScope.launch { serverStore.setLanguage(language) }
    }

    fun clearCache() = launchAction {
        realtime.stop()
        outboxRepository.pauseForServerChange()
        chatRepository.clearCache()
        outboxRepository.resume()
        realtime.start()
    }

    fun diagnosticUri(): Uri {
        val file = diagnostics.export()
        return FileProvider.getUriForFile(context, "${context.packageName}.files", file)
    }

    fun clearError() {
        error.value = null
    }

    private fun launchAction(block: suspend () -> Unit) {
        viewModelScope.launch {
            loading.value = true
            error.value = null
            runCatching { block() }.onFailure {
                diagnostics.record("ui_action_failed reason=${it.javaClass.simpleName}")
                error.value = it.message ?: "操作失败"
            }
            loading.value = false
        }
    }
}
