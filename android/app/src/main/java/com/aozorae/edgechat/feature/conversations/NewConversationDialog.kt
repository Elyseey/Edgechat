package com.aozorae.edgechat.feature.conversations

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.core.database.UserEntity

@Composable
fun NewConversationDialog(
    users: List<UserEntity>,
    language: String,
    onDismiss: () -> Unit,
    onOpenDm: (Long) -> Unit,
    onCreateGroup: (String, String, String, List<Long>) -> Unit,
) {
    var groupMode by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var privateGroup by remember { mutableStateOf(true) }
    var selectedUsers by remember { mutableStateOf(setOf<Long>()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (language == "zh-CN") "新建会话" else "New conversation") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf(false, true).forEachIndexed { index, isGroup ->
                        SegmentedButton(
                            selected = groupMode == isGroup,
                            onClick = { groupMode = isGroup },
                            shape = SegmentedButtonDefaults.itemShape(index, 2),
                        ) {
                            Text(
                                if (isGroup) {
                                    if (language == "zh-CN") "群组" else "Group"
                                } else if (language == "zh-CN") "私信" else "Direct"
                            )
                        }
                    }
                }
                if (groupMode) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        label = { Text(if (language == "zh-CN") "群组名称" else "Group name") },
                    )
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3,
                        label = { Text(if (language == "zh-CN") "描述" else "Description") },
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(privateGroup, { privateGroup = it })
                        Text(if (language == "zh-CN") "仅受邀成员可见" else "Invite-only group")
                    }
                }
                Text(if (language == "zh-CN") "选择成员" else "Choose people")
                LazyColumn(Modifier.fillMaxWidth().heightIn(max = 280.dp)) {
                    items(users, key = { it.id }) { user ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    if (!groupMode) onOpenDm(user.id)
                                    else selectedUsers = if (user.id in selectedUsers) {
                                        selectedUsers - user.id
                                    } else {
                                        selectedUsers + user.id
                                    }
                                }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (groupMode) Checkbox(user.id in selectedUsers, null)
                            Column(Modifier.weight(1f)) {
                                Text(user.displayName)
                                Text("@${user.username}", style = androidx.compose.material3.MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (groupMode) {
                FilledTonalButton(
                    enabled = name.isNotBlank(),
                    onClick = { onCreateGroup(name, description, if (privateGroup) "private" else "public", selectedUsers.toList()) },
                ) { Text(if (language == "zh-CN") "创建" else "Create") }
            }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text(if (language == "zh-CN") "取消" else "Cancel") } },
    )
}
