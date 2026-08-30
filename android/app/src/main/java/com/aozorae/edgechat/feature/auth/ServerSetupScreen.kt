package com.aozorae.edgechat.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun ServerSetupScreen(
    loading: Boolean,
    preset: String?,
    language: String,
    onConnect: (String) -> Unit,
    onBack: (() -> Unit)? = null,
) {
    var server by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(preset) { if (!preset.isNullOrBlank()) server = preset }
    Box(
        modifier = Modifier.fillMaxSize().safeDrawingPadding().imePadding(),
    ) {
        if (onBack != null) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.align(Alignment.TopStart).padding(8.dp),
            ) {
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowBack,
                    contentDescription = if (language == "zh-CN") "返回" else "Back",
                )
            }
        }
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(modifier = Modifier.widthIn(max = 460.dp).fillMaxWidth()) {
                Text("EdgeChat", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.SemiBold)
                Text(
                    if (language == "zh-CN") "连接你的 EdgeChat 服务器" else "Connect to your EdgeChat server",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(28.dp))
                OutlinedTextField(
                    value = server,
                    onValueChange = { server = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    label = { Text(if (language == "zh-CN") "服务器地址" else "Server address") },
                    placeholder = { Text("https://chat.example.com") },
                    leadingIcon = { Icon(Icons.Outlined.Link, contentDescription = null) },
                )
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { onConnect(server) },
                    enabled = server.isNotBlank() && !loading,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (loading) CircularProgressIndicator(Modifier.height(20.dp), strokeWidth = 2.dp)
                    else Text(if (language == "zh-CN") "验证并继续" else "Verify and continue")
                }
            }
        }
    }
}
