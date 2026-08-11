import { softDeleteMessage } from "./data/messages.js";
import { authorizeMessageModeration } from "./room-access.js";

export class MessageDeletionError extends Error {
	constructor(message) {
		super(message);
		this.name = "MessageDeletionError";
	}
}

export function createMessageDeletion({
	authorize = authorizeMessageModeration,
	persistDeletion = softDeleteMessage,
} = {}) {
	return async function deleteRoomMessage(env, meta, payload) {
		const messageId = Number(payload.messageId);
		if (!Number.isInteger(messageId) || messageId <= 0) {
			throw new MessageDeletionError("消息不存在");
		}

		const access = await authorize(
			env.DB,
			meta.principal,
			meta.room.kind,
			meta.room.id,
		);
		if (!access.ok) {
			throw new MessageDeletionError("无权删除该消息");
		}

		const deleted = await persistDeletion(env.DB, {
			channelId: meta.room.id,
			messageId,
		});
		if (!deleted) {
			throw new MessageDeletionError("消息不存在或已被删除");
		}

		return {
			messageId,
			packet: JSON.stringify({ type: "message_deleted", messageId }),
		};
	};
}

export const deleteRoomMessage = createMessageDeletion();
