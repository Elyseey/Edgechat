import { insertExternalMessage } from "./data/messages.js";

export async function submitExternalMessage(env, { room, payload }) {
	const result = await insertExternalMessage(env, {
		channelId: room.id,
		content: payload.content,
		externalSender: payload.externalSender,
		source: payload.source,
		sourceMessageId: payload.sourceMessageId,
	});
	return {
		...result,
		packet: JSON.stringify({ type: "message", message: result.message }),
	};
}
