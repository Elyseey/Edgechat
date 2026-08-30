package com.aozorae.edgechat.feature.chat

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Movie
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.core.database.MessageEntity
import com.aozorae.edgechat.core.database.OutboxEntity
import com.aozorae.edgechat.core.network.dto.SessionDto
import com.aozorae.edgechat.ui.components.EdgeAvatar
import com.aozorae.edgechat.ui.components.resolveServerUrl
import com.aozorae.edgechat.ui.formatDayLabel
import com.aozorae.edgechat.ui.formatMessageTime
import com.aozorae.edgechat.ui.messageDate
import kotlinx.coroutines.launch

private val ChatBubbleShape = RoundedCornerShape(topStart = 4.dp, topEnd = 20.dp, bottomEnd = 20.dp, bottomStart = 20.dp)

@Composable
fun ChatMessages(
    messages: List<MessageEntity>,
    outbox: List<OutboxEntity>,
    currentUser: SessionDto,
    serverBaseUrl: String,
    language: String,
    scrollState: LazyListState,
    onLoadOlder: () -> Unit,
    onRetry: (String) -> Unit,
    onCancel: (String) -> Unit,
    onDeleteMessage: (Long) -> Unit,
    onOpenAttachment: (String, String, String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    Box(modifier) {
        if (messages.isEmpty() && outbox.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = if (language == "zh-CN") "这里还没有消息" else "No messages here yet",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        LazyColumn(
            state = scrollState,
            reverseLayout = true,
            modifier = Modifier.fillMaxSize().testTag("message_list"),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 12.dp),
        ) {
            outbox.asReversed().forEach { pending ->
                item(key = "pending:${pending.clientMessageId}") {
                    PendingMessageItem(
                        item = pending,
                        currentUser = currentUser,
                        serverBaseUrl = serverBaseUrl,
                        language = language,
                        onRetry = onRetry,
                        onCancel = onCancel,
                    )
                }
            }

            val newestFirst = messages.asReversed()
            newestFirst.forEachIndexed { index, message ->
                val newer = newestFirst.getOrNull(index - 1)
                val older = newestFirst.getOrNull(index + 1)
                val senderKey = "${message.senderKind}:${message.senderId}"
                val showAuthor = startsMessageGroup(message, older)
                val endsAuthorGroup = newer?.let { "${it.senderKind}:${it.senderId}" } != senderKey

                item(key = message.id) {
                    MessageItem(
                        message = message,
                        own = message.senderKind == "local" && message.senderId == currentUser.userId.toString(),
                        showAuthor = showAuthor,
                        endsAuthorGroup = endsAuthorGroup,
                        serverBaseUrl = serverBaseUrl,
                        language = language,
                        onDelete = onDeleteMessage,
                        onOpenAttachment = onOpenAttachment,
                    )
                }
                if (older == null || messageDate(older.createdAt) != messageDate(message.createdAt)) {
                    item(key = "day:${messageDate(message.createdAt)}") {
                        DayHeader(formatDayLabel(message.createdAt, language))
                    }
                }
            }

            item(key = "load-older") {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    TextButton(onClick = onLoadOlder, modifier = Modifier.padding(vertical = 4.dp)) {
                        Icon(Icons.Outlined.Refresh, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(if (language == "zh-CN") "加载更早消息" else "Load older messages")
                    }
                }
            }
        }

        val threshold = with(LocalDensity.current) { 56.dp.toPx() }
        val showJump by remember(scrollState) {
            derivedStateOf {
                scrollState.firstVisibleItemIndex > 0 || scrollState.firstVisibleItemScrollOffset > threshold
            }
        }
        AnimatedVisibility(
            visible = showJump,
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 12.dp),
            enter = fadeIn() + scaleIn(),
            exit = fadeOut() + scaleOut(),
        ) {
            SmallFloatingActionButton(onClick = { scope.launch { scrollState.animateScrollToItem(0) } }) {
                Icon(
                    Icons.Outlined.KeyboardArrowDown,
                    contentDescription = if (language == "zh-CN") "回到最新消息" else "Jump to latest message",
                )
            }
        }
    }
}

internal fun startsMessageGroup(message: MessageEntity, older: MessageEntity?): Boolean =
    older == null ||
        messageDate(older.createdAt) != messageDate(message.createdAt) ||
        older.senderKind != message.senderKind ||
        older.senderId != message.senderId

@Composable
private fun MessageItem(
    message: MessageEntity,
    own: Boolean,
    showAuthor: Boolean,
    endsAuthorGroup: Boolean,
    serverBaseUrl: String,
    language: String,
    onDelete: (Long) -> Unit,
    onOpenAttachment: (String, String, String) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = if (showAuthor) 8.dp else 0.dp),
        verticalAlignment = Alignment.Top,
    ) {
        if (showAuthor) {
            EdgeAvatar(
                imageUrl = resolveServerUrl(serverBaseUrl, message.senderAvatarUrl),
                displayName = message.senderDisplayName,
                modifier = Modifier.padding(horizontal = 4.dp).size(42.dp),
                borderColor = if (own) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.tertiary,
            )
        } else {
            Spacer(Modifier.width(50.dp))
        }
        Column(Modifier.weight(1f).padding(end = 4.dp)) {
            if (showAuthor) {
                AuthorAndTimestamp(message, own, language)
            }
            Row(verticalAlignment = Alignment.Top) {
                MessageBubble(message, own, language, onOpenAttachment)
                if (own) {
                    IconButton(
                        onClick = { onDelete(message.id) },
                        modifier = Modifier.size(40.dp),
                    ) {
                        Icon(
                            Icons.Outlined.DeleteOutline,
                            contentDescription = if (language == "zh-CN") "删除消息" else "Delete message",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Spacer(Modifier.height(if (endsAuthorGroup) 8.dp else 4.dp))
        }
    }
}

@Composable
private fun AuthorAndTimestamp(message: MessageEntity, own: Boolean, language: String) {
    Row(
        modifier = Modifier.padding(start = 4.dp, bottom = 6.dp).semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = if (own) {
                if (language == "zh-CN") "我" else "You"
            } else {
                message.senderDisplayName
            },
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = formatMessageTime(message.createdAt, language),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (message.source != "edgechat") {
            Spacer(Modifier.width(8.dp))
            Text(
                text = "Telegram",
                modifier = Modifier.background(MaterialTheme.colorScheme.tertiaryContainer, RoundedCornerShape(4.dp)).padding(horizontal = 5.dp, vertical = 2.dp),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onTertiaryContainer,
            )
        }
    }
}

@Composable
private fun MessageBubble(
    message: MessageEntity,
    own: Boolean,
    language: String,
    onOpenAttachment: (String, String, String) -> Unit,
) {
    val bubbleColor = if (own) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    val contentColor = if (own) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant

    Surface(color = bubbleColor, contentColor = contentColor, shape = ChatBubbleShape) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
            if (message.content.isNotBlank()) {
                Text(message.content, style = MaterialTheme.typography.bodyLarge)
            }
            val attachmentUrl = message.attachmentUrl
            if (attachmentUrl != null) {
                if (message.content.isNotBlank()) Spacer(Modifier.height(8.dp))
                AttachmentTile(
                    name = message.attachmentName ?: "attachment",
                    type = message.attachmentType ?: "application/octet-stream",
                    own = own,
                    language = language,
                    onClick = {
                        onOpenAttachment(
                            attachmentUrl,
                            message.attachmentName ?: "attachment",
                            message.attachmentType ?: "application/octet-stream",
                        )
                    },
                )
            }
        }
    }
}

@Composable
private fun AttachmentTile(name: String, type: String, own: Boolean, language: String, onClick: () -> Unit) {
    val tileColor = if (own) Color.White.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surface
    Surface(
        color = tileColor,
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.clickable(
            role = androidx.compose.ui.semantics.Role.Button,
            onClickLabel = if (language == "zh-CN") "打开附件" else "Open attachment",
            onClick = onClick,
        ),
    ) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = when {
                    type.startsWith("image/") -> Icons.Outlined.Image
                    type.startsWith("video/") -> Icons.Outlined.Movie
                    else -> Icons.Outlined.Description
                },
                contentDescription = null,
            )
            Spacer(Modifier.width(8.dp))
            Text(name, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
            Icon(Icons.Outlined.Download, contentDescription = null, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun PendingMessageItem(
    item: OutboxEntity,
    currentUser: SessionDto,
    serverBaseUrl: String,
    language: String,
    onRetry: (String) -> Unit,
    onCancel: (String) -> Unit,
) {
    Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.Top) {
        EdgeAvatar(
            imageUrl = resolveServerUrl(serverBaseUrl, currentUser.avatarUrl),
            displayName = currentUser.displayName,
            modifier = Modifier.padding(horizontal = 4.dp).size(42.dp),
            borderColor = MaterialTheme.colorScheme.primary,
        )
        Column(Modifier.weight(1f).padding(end = 4.dp)) {
            Text(
                text = if (language == "zh-CN") "我" else "You",
                modifier = Modifier.padding(start = 4.dp, bottom = 6.dp),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
            Row(verticalAlignment = Alignment.Top) {
                Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = ChatBubbleShape) {
                    Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                        if (item.content.isNotBlank()) Text(item.content, style = MaterialTheme.typography.bodyLarge)
                        item.attachmentName?.let {
                            if (item.content.isNotBlank()) Spacer(Modifier.height(6.dp))
                            Text(it, style = MaterialTheme.typography.bodySmall)
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = when (item.state) {
                                "UPLOADING" -> if (language == "zh-CN") "正在上传" else "Uploading"
                                "SENDING" -> if (language == "zh-CN") "正在发送" else "Sending"
                                "RETRY" -> item.failure ?: if (language == "zh-CN") "发送失败" else "Failed"
                                else -> if (language == "zh-CN") "等待发送" else "Queued"
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                        )
                    }
                }
                if (item.state == "RETRY") {
                    IconButton(onClick = { onRetry(item.clientMessageId) }, modifier = Modifier.size(40.dp)) {
                        Icon(Icons.Outlined.Refresh, contentDescription = if (language == "zh-CN") "重试发送" else "Retry sending")
                    }
                }
                IconButton(onClick = { onCancel(item.clientMessageId) }, modifier = Modifier.size(40.dp)) {
                    Icon(Icons.Outlined.Close, contentDescription = if (language == "zh-CN") "取消发送" else "Cancel sending")
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun DayHeader(label: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        DayHeaderLine()
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 14.dp),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        DayHeaderLine()
    }
}

@Composable
private fun RowScope.DayHeaderLine() {
    HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
}
