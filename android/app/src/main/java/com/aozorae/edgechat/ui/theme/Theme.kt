package com.aozorae.edgechat.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val LightColors = lightColorScheme(
    primary = Color(0xFF006B5F),
    onPrimary = Color.White,
    secondary = Color(0xFF4A635E),
    tertiary = Color(0xFF3F6375),
    surface = Color(0xFFF8FAF8),
    surfaceVariant = Color(0xFFDCE5E1),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF53DBC8),
    secondary = Color(0xFFB1CCC5),
    tertiary = Color(0xFFA7CDDF),
    surface = Color(0xFF101412),
)

@Composable
fun EdgeChatTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val context = LocalContext.current
    val colors = if (Build.VERSION.SDK_INT >= 31) {
        if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    } else if (dark) {
        DarkColors
    } else {
        LightColors
    }
    MaterialTheme(colorScheme = colors, content = content)
}
