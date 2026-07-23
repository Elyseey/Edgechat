import { insertMessage } from "./data/messages.js";

export class MessageSubmissionError extends Error {
	constructor(message) {
		super(message);
		this.name = "MessageSubmissionError";
	}
}

export function createMessageSubmission({ persistMessage = insertMessage } = {}) {
	return async function submitRoomMessage(db, meta, payload) {
		try {
			const message = await persistMessage(db, {
				channelId: meta.room.id,
				senderId: meta.principal.userId,
				content: payload.content,
				attachment: payload.attachment,
			});
			return {
				message,
				packet: JSON.stringify({ type: "message", message }),
			};
		} catch (error) {
			if (error?.message === "Message content cannot be empty") {
				throw new MessageSubmissionError("消息内容不能为空");
			}
			throw error;
		}
	};
}

export const submitRoomMessage = createMessageSubmission();
