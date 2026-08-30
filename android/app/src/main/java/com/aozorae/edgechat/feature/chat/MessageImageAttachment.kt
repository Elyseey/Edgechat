package com.aozorae.edgechat.feature.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import com.aozorae.edgechat.ui.theme.LocalEdgeChatColors

internal fun isImageAttachment(contentType: String?): Boolean = contentType?.startsWith("image/") == true

@Composable
internal fun MessageImageAttachment(
    model: Any,
    name: String,
    language: String,
    tag: String,
    onClick: (() -> Unit)?,
    modifier: Modifier = Modifier,
) {
    val colors = LocalEdgeChatColors.current
    val clickModifier = if (onClick == null) {
        Modifier
    } else {
        Modifier.clickable(
            role = Role.Button,
            onClickLabel = if (language == "zh-CN") "打开图片" else "Open image",
            onClick = onClick,
        )
    }
    SubcomposeAsyncImage(
        model = model,
        contentDescription = name,
        modifier = modifier
            .fillMaxWidth()
            .widthIn(min = 160.dp, max = 320.dp)
            .aspectRatio(4f / 3f)
            .clip(RoundedCornerShape(8.dp))
            .background(colors.canvas.copy(alpha = 0.72f))
            .then(clickModifier)
            .testTag(tag),
        contentScale = ContentScale.Fit,
        loading = {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
            }
        },
        error = {
            Column(
                modifier = Modifier.fillMaxSize().padding(16.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Outlined.Image,
                    contentDescription = null,
                    modifier = Modifier.size(32.dp),
                    tint = colors.iconSecondary,
                )
                Text(
                    text = name,
                    modifier = Modifier.padding(top = 8.dp),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.textSecondary,
                )
            }
        },
    )
}
