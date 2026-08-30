package com.aozorae.edgechat.feature.chat

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.AttachFile
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
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
import com.aozorae.edgechat.ui.theme.LocalEdgeChatColors

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
    val colors = LocalEdgeChatColors.current

    Surface(modifier = modifier, color = colors.canvas) {
        Column {
            HorizontalDivider(color = colors.separator)
            attachment?.let {
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(start = 64.dp, end = 16.dp, top = 10.dp),
                    color = colors.subtleSecondary,
                    shape = MaterialTheme.shapes.medium,
                ) {
                    Row(
                        modifier = Modifier.padding(start = 12.dp, end = 4.dp, top = 6.dp, bottom = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.AttachFile, contentDescription = null, tint = colors.iconSecondary)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            it.name,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        IconButton(onClick = onClearAttachment) {
                            Icon(Icons.Outlined.Close, contentDescription = if (language == "zh-CN") "移除附件" else "Remove attachment")
                        }
                    }
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min).padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                FilledIconButton(
                    onClick = onChooseAttachment,
                    modifier = Modifier.size(48.dp),
                    shape = CircleShape,
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = colors.iconPrimary,
                        contentColor = colors.canvas,
                    ),
                ) {
                    Icon(Icons.Outlined.Add, contentDescription = if (language == "zh-CN") "选择附件" else "Choose attachment")
                }
                Spacer(Modifier.width(8.dp))
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 42.dp, max = 128.dp)
                        .border(0.5.dp, colors.subtlePrimary, RoundedCornerShape(24.dp)),
                    shape = RoundedCornerShape(24.dp),
                    color = colors.subtleSecondary,
                ) {
                    BasicTextField(
                        value = content,
                        onValueChange = { content = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 42.dp, max = 128.dp)
                            .padding(horizontal = 14.dp, vertical = 10.dp)
                            .testTag("message_input"),
                        textStyle = MaterialTheme.typography.bodyLarge.merge(TextStyle(color = colors.textPrimary)),
                        cursorBrush = SolidColor(colors.accent),
                        minLines = 1,
                        maxLines = 5,
                        decorationBox = { input ->
                            Box(contentAlignment = Alignment.CenterStart) {
                                if (content.isBlank()) {
                                    Text(
                                        text = if (language == "zh-CN") "发送消息到 $roomTitle" else "Message $roomTitle",
                                        color = colors.textSecondary,
                                        style = MaterialTheme.typography.bodyLarge,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                                input()
                            }
                        },
                    )
                }
                Spacer(Modifier.width(4.dp))
                IconButton(
                    onClick = { onSend(content); content = "" },
                    enabled = canSend,
                    modifier = Modifier.size(48.dp).testTag("send_message"),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = if (language == "zh-CN") "发送消息" else "Send message",
                        tint = if (canSend) colors.accent else colors.iconSecondary,
                    )
                }
            }
        }
    }
}
