import { insertMessage, insertMessageIdempotent } from "./data/messages.js";
import { resolveMessageMentionUserIds } from "./data/mentions.js";
import { resolveMessageReply } from "./data/replies.js";

export class MessageSubmissionError extends Error {
	constructor(message, code = "invalid_request", status = 400) {
		super(message);
		this.name = "MessageSubmissionError";
		this.code = code;
		this.status = status;
	}
}

export function createMessageSubmission({
	persistMessage = insertMessage,
	resolveMentions = resolveMessageMentionUserIds,
	resolveReply = resolveMessageReply,
} = {}) {
	return async function submitRoomMessage(env, meta, payload) {
		try {
			const [mentionUserIds, reply] = await Promise.all([
				resolveMentions(env.DB, {
					channelId: meta.room.id,
					roomKind: meta.room.kind,
					senderId: meta.principal.userId,
					content: payload.content,
					candidateUserIds: payload.mentionUserIds,
				}),
				resolveReply(env.DB, {
					channelId: meta.room.id,
					replyMessageId: payload.replyMessageId,
				}),
			]);
			const persistencePayload = {
				channelId: meta.room.id,
				senderId: meta.principal.userId,
				content: payload.content,
				attachment: payload.attachment,
				mentionUserIds,
			};
			if (reply.messageId) {
				persistencePayload.replyToMessageId = reply.messageId;
				persistencePayload.replyToSenderId = reply.senderId;
			}
			if (payload.clientMessageId) {
				persistencePayload.clientMessageId = payload.clientMessageId;
			}
			const persisted = await persistMessage(env, persistencePayload);
			const message = persisted?.message || persisted;
			const created = persisted?.message ? persisted.created !== false : true;
			return {
				message,
				created,
				replyToSenderId: reply.senderId,
				packet: JSON.stringify({ protocolVersion: 1, type: "message", message }),
			};
		} catch (error) {
			if (error?.message === "Message content cannot be empty") {
				throw new MessageSubmissionError("消息内容不能为空");
			}
			if (error?.message === "Message idempotency key was already consumed") {
				throw new MessageSubmissionError(
					"该消息已删除，不能使用相同的 clientMessageId 再次发送",
					"client_message_id_consumed",
					409,
				);
			}
			if (error?.message === "Reply message is not available") {
				throw new MessageSubmissionError(
					"回复的消息不存在或已删除",
					"reply_message_unavailable",
				);
			}
			throw error;
		}
	};
}

export const submitRoomMessage = createMessageSubmission();
export const submitRoomMessageIdempotent = createMessageSubmission({
	persistMessage: insertMessageIdempotent,
});
