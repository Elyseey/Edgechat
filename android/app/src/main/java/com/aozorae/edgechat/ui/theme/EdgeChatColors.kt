package com.aozorae.edgechat.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

@Immutable
data class EdgeChatColors(
    val canvas: Color,
    val canvasLevel1: Color,
    val subtlePrimary: Color,
    val subtleSecondary: Color,
    val separator: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val iconPrimary: Color,
    val iconSecondary: Color,
    val accent: Color,
    val accentPressed: Color,
    val onAccent: Color,
    val accentSubtle: Color,
    val onAccentSubtle: Color,
    val messageFromMe: Color,
    val messageFromOther: Color,
    val critical: Color,
    val criticalSubtle: Color,
    val onCriticalSubtle: Color,
)

internal val LightEdgeChatColors = EdgeChatColors(
    canvas = Color(0xFFFBFCFD),
    canvasLevel1 = Color(0xFFF7F9FA),
    subtlePrimary = Color(0xFFE1E6EC),
    subtleSecondary = Color(0xFFF0F2F5),
    separator = Color(0xFFE1E6EC),
    textPrimary = Color(0xFF1B1D22),
    textSecondary = Color(0xFF656D77),
    iconPrimary = Color(0xFF1B1D22),
    iconSecondary = Color(0xFF818A95),
    accent = Color(0xFF00866A),
    accentPressed = Color(0xFF006B52),
    onAccent = Color.White,
    accentSubtle = Color(0xFFE3F7ED),
    onAccentSubtle = Color(0xFF004933),
    messageFromMe = Color(0xFFE1E6EC),
    messageFromOther = Color(0xFFF0F2F5),
    critical = Color(0xFFB3261E),
    criticalSubtle = Color(0xFFFFEDEA),
    onCriticalSubtle = Color(0xFF7A1A14),
)

internal val DarkEdgeChatColors = EdgeChatColors(
    canvas = Color(0xFF14171B),
    canvasLevel1 = Color(0xFF1D1F24),
    subtlePrimary = Color(0xFF323539),
    subtleSecondary = Color(0xFF26282D),
    separator = Color(0xFF26282D),
    textPrimary = Color(0xFFEBEEF2),
    textSecondary = Color(0xFF9199A4),
    iconPrimary = Color(0xFFEBEEF2),
    iconSecondary = Color(0xFF9199A4),
    accent = Color(0xFF17AC84),
    accentPressed = Color(0xFF1FC090),
    onAccent = Color(0xFF001F0E),
    accentSubtle = Color(0xFF003D29),
    onAccentSubtle = Color(0xFFD9F4E7),
    messageFromMe = Color(0xFF323539),
    messageFromOther = Color(0xFF26282D),
    critical = Color(0xFFFFB4AB),
    criticalSubtle = Color(0xFF5F1512),
    onCriticalSubtle = Color(0xFFFFDAD5),
)

internal val LocalEdgeChatColors = staticCompositionLocalOf { LightEdgeChatColors }
