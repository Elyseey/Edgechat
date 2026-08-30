package com.aozorae.edgechat.feature.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.ui.components.EdgeChatBrandMark
import com.aozorae.edgechat.ui.theme.LocalEdgeChatColors

@Composable
fun WelcomeScreen(
    language: String,
    onContinue: () -> Unit,
) {
    val colors = LocalEdgeChatColors.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .padding(horizontal = 24.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(1f))
        EdgeChatBrandMark(size = 112.dp)
        Spacer(Modifier.height(32.dp))
        Text(
            text = "EdgeChat",
            style = MaterialTheme.typography.displaySmall,
            color = colors.textPrimary,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = if (language == "zh-CN") {
                "连接你的服务器，继续属于你的对话"
            } else {
                "Connect your server and continue the conversations that are yours."
            },
            modifier = Modifier.widthIn(max = 460.dp),
            style = MaterialTheme.typography.bodyLarge,
            color = colors.textSecondary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.weight(1f))
        Button(
            onClick = onContinue,
            modifier = Modifier
                .widthIn(max = 520.dp)
                .fillMaxWidth()
                .height(56.dp),
            shape = MaterialTheme.shapes.extraLarge,
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(if (language == "zh-CN") "连接服务器" else "Connect server")
                Spacer(Modifier.weight(1f))
                Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null)
            }
        }
    }
}
