package com.aozorae.edgechat.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp

private val LightColors = lightColorScheme(
    primary = Color(0xFF4D6384),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD9E3F6),
    onPrimaryContainer = Color(0xFF10213A),
    secondary = Color(0xFF35685D),
    secondaryContainer = Color(0xFFB8EEE0),
    onSecondaryContainer = Color(0xFF06201A),
    tertiary = Color(0xFF705680),
    tertiaryContainer = Color(0xFFF2D9FF),
    onTertiaryContainer = Color(0xFF291037),
    background = Color(0xFFFFFBFE),
    surface = Color(0xFFFFFBFE),
    surfaceVariant = Color(0xFFE5E8EF),
    outlineVariant = Color(0xFFC6C9D1),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFB4C7EA),
    onPrimary = Color(0xFF1E3555),
    primaryContainer = Color(0xFF354B6B),
    onPrimaryContainer = Color(0xFFD9E3F6),
    secondary = Color(0xFF9CD1C4),
    secondaryContainer = Color(0xFF1B5046),
    onSecondaryContainer = Color(0xFFB8EEE0),
    tertiary = Color(0xFFDDBCEB),
    tertiaryContainer = Color(0xFF573E66),
    onTertiaryContainer = Color(0xFFF2D9FF),
    background = Color(0xFF121316),
    surface = Color(0xFF121316),
    surfaceVariant = Color(0xFF44474E),
    outlineVariant = Color(0xFF44474E),
)

private val EdgeChatShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(8.dp),
    large = RoundedCornerShape(12.dp),
    extraLarge = RoundedCornerShape(16.dp),
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
    MaterialTheme(
        colorScheme = colors,
        typography = EdgeChatTypography,
        shapes = EdgeChatShapes,
        content = content,
    )
}
