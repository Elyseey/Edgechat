package com.aozorae.edgechat.feature.chat

import com.aozorae.edgechat.core.database.MessageEntity
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChatMessagesTest {
    @Test
    fun authorGroupRestartsForAnotherSender() {
        assertTrue(startsMessageGroup(message(2, "2026-08-30T10:01:00Z", "2"), message(1, "2026-08-30T10:00:00Z", "1")))
    }

    @Test
    fun authorGroupRestartsAcrossDates() {
        assertTrue(startsMessageGroup(message(2, "2026-08-31T10:01:00Z"), message(1, "2026-08-30T10:00:00Z")))
    }

    @Test
    fun adjacentMessagesFromSameSenderStayGrouped() {
        assertFalse(startsMessageGroup(message(2, "2026-08-30T10:01:00Z"), message(1, "2026-08-30T10:00:00Z")))
    }

    private fun message(id: Long, createdAt: String, senderId: String = "1") = MessageEntity(
        id = id,
        roomKind = "public",
        roomId = 1,
        clientMessageId = null,
        content = "message",
        createdAt = createdAt,
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
}
