package com.aozorae.edgechat.feature.chat

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import com.aozorae.edgechat.core.database.ConversationEntity
import com.aozorae.edgechat.core.database.UserEntity
import com.aozorae.edgechat.core.network.dto.MemberDto

@Composable
fun GroupManagementDialog(
    conversation: ConversationEntity,
    members: List<MemberDto>,
    users: List<UserEntity>,
    language: String,
    onLoad: () -> Unit,
    onRename: (String) -> Unit,
    onInvite: (List<Long>) -> Unit,
    onRemove: (Long) -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit,
) {
    var name by remember(conversation.id) { mutableStateOf(conversation.title) }
    var selectedUsers by remember { mutableStateOf(setOf<Long>()) }
    LaunchedEffect(conversation.id) { onLoad() }
    val memberIds = members.map { it.id }.toSet()
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (language == "zh-CN") "群组管理" else "Group management") },
        text = {
            Column {
                OutlinedTextField(name, { name = it }, label = { Text(if (language == "zh-CN") "群组名称" else "Group name") })
                Button(onClick = { onRename(name) }, enabled = name.isNotBlank()) {
                    Text(if (language == "zh-CN") "保存名称" else "Save name")
                }
                Text(if (language == "zh-CN") "成员" else "Members", modifier = Modifier.padding(top = 16.dp))
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(members, key = { it.id }) { member ->
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(member.displayName, modifier = Modifier.weight(1f))
                            Text(member.role)
                            if (member.role != "owner") IconButton(onClick = { onRemove(member.id) }) {
                                Icon(Icons.Outlined.Delete, contentDescription = null)
                            }
                        }
                    }
                    items(users.filterNot { it.id in memberIds }, key = { "invite:${it.id}" }) { user ->
                        Row(
                            modifier = Modifier.fillMaxWidth().clickable {
                                selectedUsers = if (user.id in selectedUsers) selectedUsers - user.id else selectedUsers + user.id
                            },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(user.id in selectedUsers, null)
                            Text(user.displayName, modifier = Modifier.weight(1f))
                        }
                    }
                }
                if (selectedUsers.isNotEmpty()) {
                    Button(onClick = { onInvite(selectedUsers.toList()); selectedUsers = emptySet() }) {
                        Icon(Icons.Outlined.PersonAdd, contentDescription = null)
                        Text(if (language == "zh-CN") "邀请所选用户" else "Invite selected")
                    }
                }
                if (!conversation.isGeneral) {
                    OutlinedButton(onClick = onDelete, modifier = Modifier.padding(top = 12.dp)) {
                        Icon(Icons.Outlined.Delete, contentDescription = null)
                        Text(if (language == "zh-CN") "删除群组" else "Delete group")
                    }
                }
            }
        },
        confirmButton = { Button(onClick = onDismiss) { Text(if (language == "zh-CN") "完成" else "Done") } },
    )
}
