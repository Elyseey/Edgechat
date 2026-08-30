package com.aozorae.edgechat.feature.chat

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.exclude
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ScaffoldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.core.database.ConversationEntity
import com.aozorae.edgechat.core.database.MessageEntity
import com.aozorae.edgechat.core.database.OutboxEntity
import com.aozorae.edgechat.core.network.dto.SessionDto
import com.aozorae.edgechat.core.repository.PendingAttachment
import com.aozorae.edgechat.core.repository.RoomIdentity
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatPane(
    room: RoomIdentity?,
    conversation: ConversationEntity?,
    messages: List<MessageEntity>,
    outbox: List<OutboxEntity>,
    attachment: PendingAttachment?,
    currentUser: SessionDto,
    serverBaseUrl: String,
    busy: Boolean,
    language: String,
    openAttachmentEvents: SharedFlow<Pair<android.net.Uri, String>>,
    onBack: (() -> Unit)?,
    onLoadOlder: () -> Unit,
    onSend: (String) -> Unit,
    onChooseAttachment: (android.net.Uri) -> Unit,
    onClearAttachment: () -> Unit,
    onRetry: (String) -> Unit,
    onCancel: (String) -> Unit,
    onDeleteMessage: (Long) -> Unit,
    onOpenAttachment: (String, String, String) -> Unit,
    onManageGroup: () -> Unit,
) {
    val context = LocalContext.current
    LaunchedEffect(openAttachmentEvents) {
        openAttachmentEvents.collect { (uri, type) ->
            val intent = Intent(Intent.ACTION_VIEW).setDataAndType(uri, type)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            context.startActivity(Intent.createChooser(intent, null))
        }
    }

    if (room == null || conversation == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                text = if (language == "zh-CN") "选择一个会话开始聊天" else "Choose a conversation to start chatting",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }

    BackHandler(enabled = onBack != null) { onBack?.invoke() }
    val scrollState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let(onChooseAttachment)
    }

    LaunchedEffect(room) { scrollState.scrollToItem(0) }
    val bottomInsets = WindowInsets.navigationBars.union(WindowInsets.ime)

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = conversation.title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = if (conversation.kind == "dm") {
                                conversation.subtitle
                            } else {
                                "${conversation.memberCount} ${if (language == "zh-CN") "位成员" else "members"}"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(
                                Icons.AutoMirrored.Outlined.ArrowBack,
                                contentDescription = if (language == "zh-CN") "返回会话列表" else "Back to conversations",
                            )
                        }
                    }
                },
                actions = {
                    if (conversation.canManage) {
                        IconButton(onClick = onManageGroup) {
                            Icon(Icons.Outlined.Group, contentDescription = if (language == "zh-CN") "管理群组" else "Manage group")
                        }
                    }
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                },
            )
        },
        contentWindowInsets = ScaffoldDefaults.contentWindowInsets
            .exclude(bottomInsets),
    ) { paddingValues ->
        // Edge-to-edge 下不能只依赖 adjustResize；取键盘与导航栏的较大底边，既避免遮挡，也避免两段高度相加形成空洞。
        Column(
            Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .windowInsetsPadding(bottomInsets),
        ) {
            ChatMessages(
                messages = messages,
                outbox = outbox,
                currentUser = currentUser,
                serverBaseUrl = serverBaseUrl,
                language = language,
                scrollState = scrollState,
                onLoadOlder = onLoadOlder,
                onRetry = onRetry,
                onCancel = onCancel,
                onDeleteMessage = onDeleteMessage,
                onOpenAttachment = onOpenAttachment,
                modifier = Modifier.weight(1f),
            )
            MessageComposer(
                roomKey = "${room.kind}:${room.id}",
                roomTitle = conversation.title,
                attachment = attachment,
                language = language,
                onChooseAttachment = { picker.launch("*/*") },
                onClearAttachment = onClearAttachment,
                onSend = { content ->
                    onSend(content)
                    scope.launch { scrollState.animateScrollToItem(0) }
                },
            )
        }
    }
}
