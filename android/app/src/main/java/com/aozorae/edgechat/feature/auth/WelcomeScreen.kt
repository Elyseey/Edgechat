package com.aozorae.edgechat.feature.auth

import android.app.Activity
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

private val WelcomeNight = Color(0xFF05090F)
private val WelcomeTeal = Color(0xFF075E5C)
private val WelcomeBlue = Color(0xFF0B3D78)
private val WelcomeGreen = Color(0xFF38866F)
private val EdgeChatBlue = Color(0xFF4D6384)

@Composable
fun WelcomeScreen(
    language: String,
    onContinue: () -> Unit,
) {
    DarkSystemBars()
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val compact = maxHeight < 560.dp
        val markSize = when {
            compact -> 128.dp
            maxWidth >= 600.dp -> 188.dp
            else -> 164.dp
        }

        WelcomeBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding()
                .padding(horizontal = 24.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (compact) {
                CompactWelcomeContent(
                    markSize = markSize,
                    language = language,
                    modifier = Modifier.weight(1f),
                )
            } else {
                PortraitWelcomeContent(
                    markSize = markSize,
                    language = language,
                    modifier = Modifier.weight(1f),
                )
            }

            Button(
                onClick = onContinue,
                modifier = Modifier
                    .widthIn(max = 520.dp)
                    .fillMaxWidth()
                    .heightIn(min = 58.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFF4F7FB),
                    contentColor = WelcomeNight,
                ),
            ) {
                Text(if (language == "zh-CN") "连接服务器" else "Connect server")
                Spacer(Modifier.size(10.dp))
                Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null)
            }
        }
    }
}

@Composable
private fun PortraitWelcomeContent(
    markSize: Dp,
    language: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.widthIn(max = 620.dp).fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(0.42f))
        EdgeChatBrandMark(markSize)
        Spacer(Modifier.weight(0.26f))
        WelcomeCopy(language, TextAlign.Center)
        Spacer(Modifier.weight(0.16f))
    }
}

@Composable
private fun CompactWelcomeContent(
    markSize: Dp,
    language: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.widthIn(max = 720.dp).fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(32.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        EdgeChatBrandMark(markSize)
        Box(Modifier.weight(1f)) {
            WelcomeCopy(language, TextAlign.Start)
        }
    }
}

@Composable
private fun WelcomeCopy(language: String, textAlign: TextAlign) {
    Column(horizontalAlignment = if (textAlign == TextAlign.Center) Alignment.CenterHorizontally else Alignment.Start) {
        Text(
            text = "EdgeChat",
            style = MaterialTheme.typography.displaySmall,
            color = Color.White,
            textAlign = textAlign,
        )
        Spacer(Modifier.height(10.dp))
        Text(
            text = if (language == "zh-CN") {
                "连接你的服务器，开始属于你的对话"
            } else {
                "Connect your server and start a conversation that's yours."
            },
            modifier = Modifier.widthIn(max = 520.dp),
            style = MaterialTheme.typography.bodyLarge,
            color = Color(0xFFB9C3D0),
            textAlign = textAlign,
        )
    }
}

@Composable
private fun EdgeChatBrandMark(size: Dp) {
    Surface(
        modifier = Modifier.size(size),
        shape = RoundedCornerShape(32.dp),
        color = Color.White.copy(alpha = 0.15f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.58f)),
        shadowElevation = 18.dp,
    ) {
        Canvas(Modifier.fillMaxSize().padding(size * 0.18f)) {
            drawBubbleMark()
        }
    }
}

private fun DrawScope.drawBubbleMark() {
    val scale = size.minDimension / 100f
    translate(left = (size.width - 100f * scale) / 2f, top = (size.height - 100f * scale) / 2f) {
        drawRoundRect(
            color = Color.White,
            topLeft = Offset(5f * scale, 12f * scale),
            size = Size(73f * scale, 50f * scale),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(18f * scale),
        )
        drawPath(
            path = Path().apply {
                moveTo(23f * scale, 57f * scale)
                lineTo(31f * scale, 75f * scale)
                lineTo(43f * scale, 59f * scale)
                close()
            },
            color = Color.White,
        )
        drawRoundRect(
            color = EdgeChatBlue,
            topLeft = Offset(35f * scale, 43f * scale),
            size = Size(60f * scale, 39f * scale),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(15f * scale),
        )
        drawPath(
            path = Path().apply {
                moveTo(65f * scale, 77f * scale)
                lineTo(74f * scale, 92f * scale)
                lineTo(82f * scale, 78f * scale)
                close()
            },
            color = EdgeChatBlue,
        )
    }
}

@Composable
private fun WelcomeBackground() {
    Canvas(Modifier.fillMaxSize()) {
        drawRect(
            brush = Brush.linearGradient(
                colors = listOf(WelcomeNight, WelcomeTeal, WelcomeGreen, WelcomeNight),
                start = Offset.Zero,
                end = Offset(size.width, size.height * 0.78f),
            ),
        )
        drawRect(
            brush = Brush.linearGradient(
                colors = listOf(WelcomeBlue, Color.Transparent, Color.Black.copy(alpha = 0.78f)),
                start = Offset(0f, size.height),
                end = Offset(size.width, size.height * 0.28f),
            ),
        )
    }
}

@Composable
private fun DarkSystemBars() {
    val view = LocalView.current
    DisposableEffect(view) {
        val controller = WindowCompat.getInsetsController((view.context as Activity).window, view)
        val lightStatusBars = controller.isAppearanceLightStatusBars
        val lightNavigationBars = controller.isAppearanceLightNavigationBars
        controller.isAppearanceLightStatusBars = false
        controller.isAppearanceLightNavigationBars = false
        onDispose {
            controller.isAppearanceLightStatusBars = lightStatusBars
            controller.isAppearanceLightNavigationBars = lightNavigationBars
        }
    }
}
