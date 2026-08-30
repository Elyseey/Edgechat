package com.aozorae.edgechat.feature.settings

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Cached
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.core.network.dto.SessionDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsSheet(
    session: SessionDto,
    language: String,
    onDismiss: () -> Unit,
    onUpdateProfile: (String) -> Unit,
    onUpdateAvatar: (String, android.net.Uri) -> Unit,
    onChangePassword: (String, String) -> Unit,
    onLanguage: (String) -> Unit,
    onClearCache: () -> Unit,
    diagnosticUri: () -> android.net.Uri,
    onLogout: () -> Unit,
) {
    val context = LocalContext.current
    var displayName by remember(session.userId, session.displayName) { mutableStateOf(session.displayName) }
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { onUpdateAvatar(displayName, it) }
    }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(if (language == "zh-CN") "设置" else "Settings", style = MaterialTheme.typography.headlineSmall)
            OutlinedTextField(displayName, { displayName = it }, modifier = Modifier.fillMaxWidth(), label = { Text(if (language == "zh-CN") "显示名称" else "Display name") })
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { onUpdateProfile(displayName) }) { Text(if (language == "zh-CN") "保存资料" else "Save profile") }
                OutlinedButton(onClick = { avatarPicker.launch("image/*") }) {
                    androidx.compose.material3.Icon(Icons.Outlined.Image, contentDescription = if (language == "zh-CN") "更换头像" else "Change avatar")
                    Text(if (language == "zh-CN") "更换头像" else "Change avatar")
                }
            }
            HorizontalDivider(Modifier.padding(vertical = 6.dp))
            OutlinedTextField(currentPassword, { currentPassword = it }, modifier = Modifier.fillMaxWidth(), visualTransformation = PasswordVisualTransformation(), label = { Text(if (language == "zh-CN") "当前密码" else "Current password") })
            OutlinedTextField(newPassword, { newPassword = it }, modifier = Modifier.fillMaxWidth(), visualTransformation = PasswordVisualTransformation(), label = { Text(if (language == "zh-CN") "新密码" else "New password") })
            Button(enabled = currentPassword.isNotBlank() && newPassword.isNotBlank(), onClick = { onChangePassword(currentPassword, newPassword); currentPassword = ""; newPassword = "" }) {
                Text(if (language == "zh-CN") "修改密码" else "Change password")
            }
            HorizontalDivider(Modifier.padding(vertical = 6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (language == "zh-CN") Button(onClick = {}) { Text("中文") }
                else OutlinedButton(onClick = { onLanguage("zh-CN") }) { Text("中文") }
                if (language == "en-US") Button(onClick = {}) { Text("English") }
                else OutlinedButton(onClick = { onLanguage("en-US") }) { Text("English") }
            }
            OutlinedButton(onClick = onClearCache, modifier = Modifier.fillMaxWidth()) {
                androidx.compose.material3.Icon(Icons.Outlined.Cached, contentDescription = if (language == "zh-CN") "清理缓存" else "Clear cache")
                Text(if (language == "zh-CN") "清理并重新同步本地缓存" else "Clear and resync local cache")
            }
            OutlinedButton(
                onClick = {
                    val intent = Intent(Intent.ACTION_SEND)
                        .setType("text/plain")
                        .putExtra(Intent.EXTRA_STREAM, diagnosticUri())
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    context.startActivity(Intent.createChooser(intent, null))
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                androidx.compose.material3.Icon(Icons.Outlined.Share, contentDescription = if (language == "zh-CN") "导出诊断日志" else "Export diagnostics")
                Text(if (language == "zh-CN") "导出诊断日志" else "Export diagnostics")
            }
            OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
                androidx.compose.material3.Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = if (language == "zh-CN") "注销" else "Sign out")
                Text(if (language == "zh-CN") "注销并清理缓存" else "Sign out and clear cache")
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}
