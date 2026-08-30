package com.aozorae.edgechat.feature.chat

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import com.aozorae.edgechat.core.database.MessageEntity
import com.aozorae.edgechat.core.database.OutboxEntity
import com.aozorae.edgechat.core.network.dto.SessionDto
import com.aozorae.edgechat.ui.theme.EdgeChatTheme
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ChatMessagesLayoutTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun ownAndIncomingMessagesUseOppositeSides() {
        compose.setContent {
            EdgeChatTheme {
                Box(Modifier.width(360.dp).height(640.dp)) {
                    ChatMessages(
                        messages = listOf(
                            message(id = 1, senderId = "2", content = "Incoming"),
                            message(id = 2, senderId = "1", content = "Mine"),
                        ),
                        outbox = listOf(pendingMessage()),
                        currentUser = currentUser(),
                        serverBaseUrl = "https://example.com",
                        language = "en-US",
                        scrollState = rememberLazyListState(),
                        onLoadOlder = {},
                        onRetry = {},
                        onCancel = {},
                        onDeleteMessage = {},
                        onOpenAttachment = { _, _, _ -> },
                    )
                }
            }
        }

        val listCenter = compose.onNodeWithTag("message_list").fetchSemanticsNode().boundsInRoot.center.x
        val incomingCenter = compose.onNodeWithTag("message_bubble:1").fetchSemanticsNode().boundsInRoot.center.x
        val ownCenter = compose.onNodeWithTag("message_bubble:2").fetchSemanticsNode().boundsInRoot.center.x
        val pendingCenter = compose
            .onNodeWithTag("pending_message_bubble:pending-1")
            .fetchSemanticsNode()
            .boundsInRoot
            .center
            .x

        assertTrue(incomingCenter < listCenter)
        assertTrue(ownCenter > listCenter)
        assertTrue(pendingCenter > listCenter)
    }

    private fun currentUser() = SessionDto(
        userId = 1,
        username = "me",
        displayName = "Me",
    )

    private fun message(id: Long, senderId: String, content: String) = MessageEntity(
        id = id,
        roomKind = "public",
        roomId = 1,
        clientMessageId = null,
        content = content,
        createdAt = "2026-08-30T10:0${id}:00Z",
        source = "edgechat",
        senderKind = "local",
        senderId = senderId,
        senderUsername = "user$senderId",
        senderDisplayName = "User $senderId",
        senderAvatarUrl = "",
        attachmentKey = null,
        attachmentName = null,
        attachmentType = null,
        attachmentSize = null,
        attachmentUrl = null,
    )

    private fun pendingMessage() = OutboxEntity(
        clientMessageId = "pending-1",
        roomKind = "public",
        roomId = 1,
        content = "Pending",
        localAttachmentPath = null,
        attachmentName = null,
        attachmentType = null,
        attachmentSize = null,
        clientUploadId = null,
        uploadedKey = null,
        uploadedUrl = null,
        state = "SENDING",
        failure = null,
        attempts = 0,
        createdAt = 0,
    )
}
