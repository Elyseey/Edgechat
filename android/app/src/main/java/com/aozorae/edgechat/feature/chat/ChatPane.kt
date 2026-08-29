package com.aozorae.edgechat.feature.chat

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.AttachFile
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.core.database.ConversationEntity
import com.aozorae.edgechat.core.database.MessageEntity
import com.aozorae.edgechat.core.database.OutboxEntity
import com.aozorae.edgechat.core.repository.PendingAttachment
import com.aozorae.edgechat.core.repository.RoomIdentity
import kotlinx.coroutines.flow.SharedFlow

@Composable
fun ChatPane(
    room: RoomIdentity?,
    conversation: ConversationEntity?,
    messages: List<MessageEntity>,
    outbox: List<OutboxEntity>,
    attachment: PendingAttachment?,
    currentUserId: Long,
    busy: Boolean,
    language: String,
    openAttachmentEvents: SharedFlow<Pair<android.net.Uri, String>>,
    onBack: () -> Unit,
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
                if (language == "zh-CN") "选择一个会话开始聊天" else "Choose a conversation to start chatting",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }
    BackHandler(onBack = onBack)
    var content by remember(room) { mutableStateOf("") }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let(onChooseAttachment)
    }
    Column(Modifier.fillMaxHeight()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = null) }
            Column(Modifier.weight(1f)) {
                Text(conversation.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    if (conversation.kind == "dm") conversation.subtitle else "${conversation.memberCount} ${if (language == "zh-CN") "位成员" else "members"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (conversation.canManage) {
                IconButton(onClick = onManageGroup) { Icon(Icons.Outlined.Group, contentDescription = null) }
            }
            if (busy) CircularProgressIndicator(Modifier.width(22.dp), strokeWidth = 2.dp)
        }
        HorizontalDivider()
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp),
            reverseLayout = true,
        ) {
            items(outbox.reversed(), key = { "pending:${it.clientMessageId}" }) { item ->
                PendingMessageRow(item, language, onRetry, onCancel)
            }
            items(messages.reversed(), key = { it.id }) { message ->
                MessageRow(
                    message,
                    own = message.senderKind == "local" && message.senderId == currentUserId.toString(),
                    onDelete = onDeleteMessage,
                    onOpenAttachment = onOpenAttachment,
                )
            }
            item {
                OutlinedButton(onClick = onLoadOlder, modifier = Modifier.padding(vertical = 12.dp)) {
                    Icon(Icons.Outlined.Refresh, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (language == "zh-CN") "加载更早消息" else "Load older messages")
                }
            }
        }
        attachment?.let {
            Row(
                modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant).padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.AttachFile, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(it.name, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                IconButton(onClick = onClearAttachment) { Icon(Icons.Outlined.Close, contentDescription = null) }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(10.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            IconButton(onClick = { picker.launch("*/*") }) {
                Icon(Icons.Outlined.AttachFile, contentDescription = if (language == "zh-CN") "附件" else "Attachment")
            }
            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                modifier = Modifier.weight(1f).heightIn(min = 52.dp, max = 140.dp),
                placeholder = { Text(if (language == "zh-CN") "输入消息" else "Message") },
                maxLines = 5,
            )
            Spacer(Modifier.width(8.dp))
            FilledIconButton(
                enabled = content.isNotBlank() || attachment != null,
                onClick = { onSend(content); content = "" },
            ) { Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = null) }
        }
    }
}

@Composable
private fun MessageRow(
    message: MessageEntity,
    own: Boolean,
    onDelete: (Long) -> Unit,
    onOpenAttachment: (String, String, String) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = if (own) Arrangement.End else Arrangement.Start,
    ) {
        Surface(
            color = if (own) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
            shape = MaterialTheme.shapes.medium,
            modifier = Modifier.fillMaxWidth(0.82f),
        ) {
            Column(Modifier.padding(12.dp)) {
                if (!own) {
                    Text(message.senderDisplayName, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                }
                if (message.content.isNotBlank()) Text(message.content)
                if (message.attachmentUrl != null) {
                    Button(
                        onClick = {
                            onOpenAttachment(
                                message.attachmentUrl,
                                message.attachmentName ?: "attachment",
                                message.attachmentType ?: "application/octet-stream",
                            )
                        },
                    ) {
                        Icon(Icons.Outlined.Download, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(message.attachmentName ?: "attachment", maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(message.createdAt, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                    if (own) IconButton(onClick = { onDelete(message.id) }) {
                        Icon(Icons.Outlined.Delete, contentDescription = null)
                    }
                }
            }
        }
    }
}

@Composable
private fun PendingMessageRow(
    item: OutboxEntity,
    language: String,
    onRetry: (String) -> Unit,
    onCancel: (String) -> Unit,
) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.End) {
        Surface(color = MaterialTheme.colorScheme.tertiaryContainer, shape = MaterialTheme.shapes.medium) {
            Column(Modifier.padding(12.dp)) {
                if (item.content.isNotBlank()) Text(item.content)
                item.attachmentName?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                Text(
                    when (item.state) {
                        "UPLOADING" -> if (language == "zh-CN") "正在上传" else "Uploading"
                        "SENDING" -> if (language == "zh-CN") "正在发送" else "Sending"
                        "RETRY" -> item.failure ?: if (language == "zh-CN") "发送失败" else "Failed"
                        else -> if (language == "zh-CN") "等待发送" else "Queued"
                    },
                    style = MaterialTheme.typography.labelSmall,
                )
                Row {
                    if (item.state == "RETRY") IconButton(onClick = { onRetry(item.clientMessageId) }) {
                        Icon(Icons.Outlined.Refresh, contentDescription = null)
                    }
                    IconButton(onClick = { onCancel(item.clientMessageId) }) {
                        Icon(Icons.Outlined.Close, contentDescription = null)
                    }
                }
            }
        }
    }
}
