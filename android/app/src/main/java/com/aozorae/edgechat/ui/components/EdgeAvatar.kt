package com.aozorae.edgechat.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import coil.compose.SubcomposeAsyncImage

@Composable
fun EdgeAvatar(
    imageUrl: String,
    displayName: String,
    modifier: Modifier = Modifier,
    borderColor: Color? = null,
) {
    val avatarModifier = modifier
        .clip(CircleShape)
        .then(
            if (borderColor == null) Modifier
            else Modifier.border(width = androidx.compose.ui.unit.Dp.Hairline, color = borderColor, shape = CircleShape),
        )

    SubcomposeAsyncImage(
        model = imageUrl.takeIf(String::isNotBlank),
        contentDescription = displayName,
        modifier = avatarModifier,
        contentScale = ContentScale.Crop,
        loading = { AvatarFallback(displayName) },
        error = { AvatarFallback(displayName) },
    )
}

@Composable
private fun AvatarFallback(displayName: String) {
    Box(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.secondaryContainer),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = displayName.trim().firstOrNull()?.uppercase() ?: "E",
            color = MaterialTheme.colorScheme.onSecondaryContainer,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

fun resolveServerUrl(serverBaseUrl: String, path: String): String = when {
    path.isBlank() -> ""
    path.startsWith("https://") || path.startsWith("http://") -> path
    else -> "${serverBaseUrl.trimEnd('/')}/${path.trimStart('/')}"
}
