package com.aozorae.edgechat.feature.conversations

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Badge
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.core.database.ConversationEntity
import com.aozorae.edgechat.core.database.UserEntity
import com.aozorae.edgechat.core.network.dto.SessionDto
import com.aozorae.edgechat.core.repository.RoomIdentity
import com.aozorae.edgechat.ui.components.EdgeAvatar
import com.aozorae.edgechat.ui.components.resolveServerUrl
import com.aozorae.edgechat.ui.formatConversationTime

@Composable
fun ConversationPane(
    siteName: String,
    siteIconUrl: String,
    serverBaseUrl: String,
    currentUser: SessionDto,
    conversations: List<ConversationEntity>,
    users: List<UserEntity>,
    selected: RoomIdentity?,
    language: String,
    onSelect: (RoomIdentity) -> Unit,
    onJoin: (Long) -> Unit,
    onOpenDm: (Long) -> Unit,
    onCreateGroup: (String, String, String, List<Long>) -> Unit,
    onSettings: () -> Unit,
) {
    var showNew by remember { mutableStateOf(false) }

    Surface(color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxHeight().statusBarsPadding()) {
            ConversationHeader(
                siteName = siteName,
                siteIconUrl = resolveServerUrl(serverBaseUrl, siteIconUrl),
                language = language,
                onNewConversation = { showNew = true },
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Text(
                text = if (language == "zh-CN") "会话" else "Chats",
                modifier = Modifier.padding(start = 28.dp, top = 20.dp, bottom = 8.dp),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                if (conversations.isEmpty()) {
                    item {
                        Text(
                            text = if (language == "zh-CN") "还没有会话，创建一个或加入公开群组。" else "No conversations yet. Create one or join a public group.",
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 24.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                items(conversations, key = { "${it.kind}:${it.id}" }) { item ->
                    ConversationRow(
                        item = item,
                        selected = selected?.kind == item.kind && selected.id == item.id,
                        serverBaseUrl = serverBaseUrl,
                        language = language,
                        onClick = {
                            if (item.isMember) onSelect(RoomIdentity(item.kind, item.id)) else onJoin(item.id)
                        },
                    )
                }
            }
            CurrentUserRow(
                currentUser = currentUser,
                serverBaseUrl = serverBaseUrl,
                language = language,
                onSettings = onSettings,
            )
        }
    }

    if (showNew) {
        NewConversationDialog(
            users = users,
            language = language,
            onDismiss = { showNew = false },
            onOpenDm = { showNew = false; onOpenDm(it) },
            onCreateGroup = { name, description, kind, ids ->
                showNew = false
                onCreateGroup(name, description, kind, ids)
            },
        )
    }
}

@Composable
private fun ConversationHeader(
    siteName: String,
    siteIconUrl: String,
    language: String,
    onNewConversation: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        EdgeAvatar(siteIconUrl, siteName, Modifier.size(36.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = siteName,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = "EdgeChat",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        IconButton(onClick = onNewConversation) {
            Icon(Icons.Outlined.Add, contentDescription = if (language == "zh-CN") "新建会话" else "New conversation")
        }
    }
}

@Composable
private fun ConversationRow(
    item: ConversationEntity,
    selected: Boolean,
    serverBaseUrl: String,
    language: String,
    onClick: () -> Unit,
) {
    val background = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
    val contentColor = if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(CircleShape)
            .background(background)
            .semantics { this.selected = selected }
            .clickable(role = Role.Button, onClick = onClick)
            .testTag("conversation:${item.kind}:${item.id}")
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box {
            EdgeAvatar(
                imageUrl = resolveServerUrl(serverBaseUrl, item.avatarUrl),
                displayName = item.title,
                modifier = Modifier.size(46.dp),
                borderColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
            )
            if (item.kind != "dm") {
                Surface(
                    modifier = Modifier.align(Alignment.BottomEnd).size(18.dp),
                    shape = CircleShape,
                    color = if (item.kind == "private") MaterialTheme.colorScheme.tertiaryContainer else MaterialTheme.colorScheme.secondaryContainer,
                ) {
                    Icon(
                        imageVector = if (item.kind == "private") Icons.Outlined.Lock else Icons.Outlined.Group,
                        contentDescription = if (item.kind == "private") {
                            if (language == "zh-CN") "私有群组" else "Private group"
                        } else if (language == "zh-CN") "公开群组" else "Public group",
                        modifier = Modifier.padding(3.dp),
                    )
                }
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = item.title,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.bodyLarge,
                    color = contentColor,
                    fontWeight = if (item.unreadCount > 0) FontWeight.SemiBold else FontWeight.Medium,
                )
                val time = formatConversationTime(item.lastMessageAt, language)
                if (time.isNotBlank()) {
                    Text(
                        text = time,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.size(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                val subtitle = if (!item.isMember) {
                    if (language == "zh-CN") "点按加入公开群组" else "Tap to join public group"
                } else {
                    item.subtitle.ifBlank {
                        "${item.memberCount} ${if (language == "zh-CN") "位成员" else "members"}"
                    }
                }
                Text(
                    text = subtitle,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (item.unreadCount > 0) {
                    Spacer(Modifier.width(8.dp))
                    Badge { Text(if (item.unreadCount > 99) "99+" else item.unreadCount.toString()) }
                }
            }
        }
    }
}

@Composable
private fun CurrentUserRow(
    currentUser: SessionDto,
    serverBaseUrl: String,
    language: String,
    onSettings: () -> Unit,
) {
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(role = Role.Button, onClick = onSettings)
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        EdgeAvatar(
            imageUrl = resolveServerUrl(serverBaseUrl, currentUser.avatarUrl),
            displayName = currentUser.displayName,
            modifier = Modifier.size(40.dp),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(currentUser.displayName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            Text("@${currentUser.username}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(
            Icons.Outlined.Settings,
            contentDescription = if (language == "zh-CN") "设置" else "Settings",
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
