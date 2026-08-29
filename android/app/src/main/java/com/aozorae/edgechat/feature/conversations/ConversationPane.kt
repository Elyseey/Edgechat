package com.aozorae.edgechat.feature.conversations

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.core.database.ConversationEntity
import com.aozorae.edgechat.core.database.UserEntity
import com.aozorae.edgechat.core.repository.RoomIdentity

@Composable
fun ConversationPane(
    siteName: String,
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
    Column(Modifier.fillMaxHeight()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(siteName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            IconButton(onClick = { showNew = true }) {
                Icon(Icons.Outlined.Add, contentDescription = if (language == "zh-CN") "新建会话" else "New conversation")
            }
            IconButton(onClick = onSettings) {
                Icon(Icons.Outlined.Settings, contentDescription = if (language == "zh-CN") "设置" else "Settings")
            }
        }
        HorizontalDivider()
        LazyColumn(Modifier.weight(1f)) {
            items(conversations, key = { "${it.kind}:${it.id}" }) { item ->
                ConversationRow(
                    item = item,
                    selected = selected?.kind == item.kind && selected.id == item.id,
                    language = language,
                    onClick = {
                        if (item.isMember) onSelect(RoomIdentity(item.kind, item.id)) else onJoin(item.id)
                    },
                )
            }
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
private fun ConversationRow(
    item: ConversationEntity,
    selected: Boolean,
    language: String,
    onClick: () -> Unit,
) {
    Surface(color = if (selected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surface) {
        Row(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                if (item.kind == "dm") Icons.Outlined.Person else if (item.kind == "private") Icons.Outlined.Lock else Icons.Outlined.Group,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Medium)
                val subtitle = if (!item.isMember) {
                    if (language == "zh-CN") "点按加入公开群组" else "Tap to join public group"
                } else item.subtitle
                if (subtitle.isNotBlank()) {
                    Text(subtitle, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (item.unreadCount > 0) Badge { Text(item.unreadCount.toString()) }
        }
    }
}

@Composable
private fun NewConversationDialog(
    users: List<UserEntity>,
    language: String,
    onDismiss: () -> Unit,
    onOpenDm: (Long) -> Unit,
    onCreateGroup: (String, String, String, List<Long>) -> Unit,
) {
    var mode by remember { mutableStateOf("dm") }
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var privateGroup by remember { mutableStateOf(true) }
    var selectedUsers by remember { mutableStateOf(setOf<Long>()) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (language == "zh-CN") "新建会话" else "New conversation") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (mode == "dm") Button(onClick = {}) { Text(if (language == "zh-CN") "私信" else "Direct") }
                    else OutlinedButton(onClick = { mode = "dm" }) { Text(if (language == "zh-CN") "私信" else "Direct") }
                    if (mode == "group") Button(onClick = {}) { Text(if (language == "zh-CN") "群组" else "Group") }
                    else OutlinedButton(onClick = { mode = "group" }) { Text(if (language == "zh-CN") "群组" else "Group") }
                }
                if (mode == "group") {
                    OutlinedTextField(name, { name = it }, label = { Text(if (language == "zh-CN") "群组名称" else "Group name") })
                    OutlinedTextField(description, { description = it }, label = { Text(if (language == "zh-CN") "描述" else "Description") })
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(privateGroup, { privateGroup = it })
                        Text(if (language == "zh-CN") "私有群组" else "Private group")
                    }
                }
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(users, key = { it.id }) { user ->
                        Row(
                            modifier = Modifier.fillMaxWidth().clickable {
                                if (mode == "dm") onOpenDm(user.id)
                                else selectedUsers = if (user.id in selectedUsers) selectedUsers - user.id else selectedUsers + user.id
                            }.padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (mode == "group") Checkbox(user.id in selectedUsers, null)
                            Text(user.displayName, modifier = Modifier.weight(1f))
                            Text("@${user.username}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (mode == "group") {
                FilledTonalButton(
                    enabled = name.isNotBlank(),
                    onClick = { onCreateGroup(name, description, if (privateGroup) "private" else "public", selectedUsers.toList()) },
                ) { Text(if (language == "zh-CN") "创建" else "Create") }
            }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text(if (language == "zh-CN") "取消" else "Cancel") } },
    )
}
