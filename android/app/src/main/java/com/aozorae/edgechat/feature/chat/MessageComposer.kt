package com.aozorae.edgechat.feature.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.outlined.AttachFile
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.core.repository.PendingAttachment

@Composable
fun MessageComposer(
    roomKey: String,
    roomTitle: String,
    attachment: PendingAttachment?,
    language: String,
    onChooseAttachment: () -> Unit,
    onClearAttachment: () -> Unit,
    onSend: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var content by rememberSaveable(roomKey) { mutableStateOf("") }
    val canSend = content.isNotBlank() || attachment != null

    Surface(
        modifier = modifier,
        tonalElevation = 2.dp,
        shadowElevation = 2.dp,
    ) {
        Column {
            attachment?.let {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(8.dp))
                        .padding(start = 12.dp, end = 4.dp, top = 6.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.AttachFile, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(it.name, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    IconButton(onClick = onClearAttachment) {
                        Icon(Icons.Outlined.Close, contentDescription = if (language == "zh-CN") "移除附件" else "Remove attachment")
                    }
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                IconButton(
                    onClick = onChooseAttachment,
                    modifier = Modifier.size(48.dp),
                ) {
                    Icon(Icons.Outlined.AttachFile, contentDescription = if (language == "zh-CN") "选择附件" else "Choose attachment")
                }
                Surface(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(24.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                ) {
                    BasicTextField(
                        value = content,
                        onValueChange = { content = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 48.dp, max = 128.dp)
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                            .testTag("message_input"),
                        textStyle = MaterialTheme.typography.bodyLarge.merge(TextStyle(color = MaterialTheme.colorScheme.onSurface)),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        minLines = 1,
                        maxLines = 5,
                        decorationBox = { input ->
                            Box(contentAlignment = Alignment.CenterStart) {
                                if (content.isBlank()) {
                                    Text(
                                        text = if (language == "zh-CN") "发送消息到 $roomTitle" else "Message $roomTitle",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        style = MaterialTheme.typography.bodyLarge,
                                    )
                                }
                                input()
                            }
                        },
                    )
                }
                Spacer(Modifier.width(6.dp))
                FilledIconButton(
                    onClick = { onSend(content); content = "" },
                    enabled = canSend,
                    modifier = Modifier.size(48.dp).testTag("send_message"),
                    shape = CircleShape,
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = if (language == "zh-CN") "发送消息" else "Send message",
                    )
                }
            }
        }
    }
}
