package com.aozorae.edgechat.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aozorae.edgechat.feature.app.AppViewModel
import com.aozorae.edgechat.feature.auth.LoginScreen
import com.aozorae.edgechat.feature.auth.ServerSetupScreen
import com.aozorae.edgechat.feature.chat.ChatPane
import com.aozorae.edgechat.feature.chat.ChatViewModel
import com.aozorae.edgechat.feature.chat.GroupManagementDialog
import com.aozorae.edgechat.feature.conversations.ConversationPane
import com.aozorae.edgechat.feature.settings.SettingsSheet
import kotlinx.coroutines.flow.StateFlow

@Composable
fun EdgeChatApp(
    deepLinkServer: StateFlow<String?>,
    appViewModel: AppViewModel = hiltViewModel(),
    chatViewModel: ChatViewModel = hiltViewModel(),
) {
    val appState by appViewModel.state.collectAsStateWithLifecycle()
    val chatState by chatViewModel.state.collectAsStateWithLifecycle()
    val preset by deepLinkServer.collectAsStateWithLifecycle()
    var showSettings by remember { mutableStateOf(false) }
    var showGroup by remember { mutableStateOf(false) }

    LaunchedEffect(preset) {
        if (!preset.isNullOrBlank() && preset != appState.server?.baseUrl) appViewModel.connect(requireNotNull(preset))
    }

    if (appState.loading && appState.server == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
    } else if (appState.server == null) {
        ServerSetupScreen(appState.loading, preset, appState.language, appViewModel::connect)
    } else if (appState.session == null) {
        LoginScreen(
            server = requireNotNull(appState.server),
            loading = appState.loading,
            language = appState.language,
            onLogin = appViewModel::login,
            onChangeServer = appViewModel::disconnect,
        )
    } else {
        val session = requireNotNull(appState.session)
        val server = requireNotNull(appState.server)
        val selectedConversation = chatState.selectedRoom?.let { room ->
            chatState.conversations.firstOrNull { it.kind == room.kind && it.id == room.id }
        }
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val tablet = maxWidth >= 840.dp
            if (tablet) {
                Row(Modifier.fillMaxSize()) {
                    Box(Modifier.width(340.dp)) {
                        ConversationPane(
                            server.siteName,
                            chatState.conversations,
                            chatState.users,
                            chatState.selectedRoom,
                            appState.language,
                            chatViewModel::select,
                            chatViewModel::join,
                            chatViewModel::openDm,
                            chatViewModel::createGroup,
                            { showSettings = true },
                        )
                    }
                    Box(Modifier.weight(1f)) {
                        ChatPane(
                            room = chatState.selectedRoom,
                            conversation = selectedConversation,
                            messages = chatState.messages,
                            outbox = chatState.outbox,
                            attachment = chatState.attachment,
                            currentUserId = session.userId,
                            busy = chatState.busy,
                            language = appState.language,
                            openAttachmentEvents = chatViewModel.openAttachment,
                            onBack = { chatViewModel.select(null) },
                            onLoadOlder = chatViewModel::loadOlder,
                            onSend = chatViewModel::send,
                            onChooseAttachment = chatViewModel::chooseAttachment,
                            onClearAttachment = chatViewModel::clearAttachment,
                            onRetry = chatViewModel::retry,
                            onCancel = chatViewModel::cancel,
                            onDeleteMessage = chatViewModel::deleteMessage,
                            onOpenAttachment = chatViewModel::openAttachment,
                            onManageGroup = { showGroup = true },
                        )
                    }
                }
            } else if (chatState.selectedRoom == null) {
                ConversationPane(
                    server.siteName,
                    chatState.conversations,
                    chatState.users,
                    null,
                    appState.language,
                    chatViewModel::select,
                    chatViewModel::join,
                    chatViewModel::openDm,
                    chatViewModel::createGroup,
                    { showSettings = true },
                )
            } else {
                ChatPane(
                    room = chatState.selectedRoom,
                    conversation = selectedConversation,
                    messages = chatState.messages,
                    outbox = chatState.outbox,
                    attachment = chatState.attachment,
                    currentUserId = session.userId,
                    busy = chatState.busy,
                    language = appState.language,
                    openAttachmentEvents = chatViewModel.openAttachment,
                    onBack = { chatViewModel.select(null) },
                    onLoadOlder = chatViewModel::loadOlder,
                    onSend = chatViewModel::send,
                    onChooseAttachment = chatViewModel::chooseAttachment,
                    onClearAttachment = chatViewModel::clearAttachment,
                    onRetry = chatViewModel::retry,
                    onCancel = chatViewModel::cancel,
                    onDeleteMessage = chatViewModel::deleteMessage,
                    onOpenAttachment = chatViewModel::openAttachment,
                    onManageGroup = { showGroup = true },
                )
            }
        }

        if (showSettings) {
            SettingsSheet(
                session = session,
                language = appState.language,
                onDismiss = { showSettings = false },
                onUpdateProfile = appViewModel::updateProfile,
                onUpdateAvatar = appViewModel::updateAvatar,
                onChangePassword = appViewModel::changePassword,
                onLanguage = appViewModel::setLanguage,
                onClearCache = appViewModel::clearCache,
                diagnosticUri = appViewModel::diagnosticUri,
                onLogout = { showSettings = false; appViewModel.logout() },
            )
        }
        if (showGroup && selectedConversation != null) {
            GroupManagementDialog(
                conversation = selectedConversation,
                members = chatState.members,
                users = chatState.users,
                language = appState.language,
                onLoad = { chatViewModel.loadMembers(selectedConversation.id) },
                onRename = { chatViewModel.renameGroup(selectedConversation.id, it) },
                onInvite = { chatViewModel.invite(selectedConversation.id, it) },
                onRemove = { chatViewModel.removeMember(selectedConversation.id, it) },
                onDelete = { showGroup = false; chatViewModel.deleteGroup(selectedConversation.id) },
                onDismiss = { showGroup = false },
            )
        }
    }

    val failure = appState.error ?: chatState.error
    if (failure != null) {
        AlertDialog(
            onDismissRequest = { appViewModel.clearError(); chatViewModel.clearError() },
            title = { Text(if (appState.language == "zh-CN") "操作失败" else "Something went wrong") },
            text = { Text(failure) },
            confirmButton = {
                Button(onClick = { appViewModel.clearError(); chatViewModel.clearError() }) {
                    Text(if (appState.language == "zh-CN") "知道了" else "OK")
                }
            },
        )
    }
}
