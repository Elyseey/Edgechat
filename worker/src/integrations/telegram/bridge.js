import {
	getTelegramCredentials,
	listEnabledTelegramMappingsForChannel,
} from "../../data/telegram.js";
import { submitExternalRoomMessage } from "../../do-bridge.js";
import { sendTelegramText } from "./client.js";

function logBridgeFailure(message, data) {
	console.warn(JSON.stringify({ message, ...data }));
}

export function splitTelegramText(text, limit = 4096) {
	const characters = Array.from(String(text));
	const chunks = [];
	for (let offset = 0; offset < characters.length; offset += limit) {
		chunks.push(characters.slice(offset, offset + limit).join(""));
	}
	return chunks;
}

export async function forwardEdgeChatMessageToTelegram(env, { room, message }) {
	if (room.kind !== "public" || message.source === "telegram") {
		return;
	}

	try {
		const [credentials, mappings] = await Promise.all([
			getTelegramCredentials(env),
			listEnabledTelegramMappingsForChannel(env.DB, room.id),
		]);
		if (!credentials || !mappings.length || !message.content) {
			return;
		}

		const text = `${message.sender.displayName}: ${message.content}`;
		await Promise.all(
			mappings.map(async (mapping) => {
				try {
					for (const chunk of splitTelegramText(text)) {
						await sendTelegramText(credentials.botToken, {
							chatId: mapping.telegramChatId,
							text: chunk,
						});
					}
				} catch (error) {
					logBridgeFailure("telegram outbound message failed", {
						roomId: Number(room.id),
						mappingId: mapping.id,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}),
		);
	} catch (error) {
		logBridgeFailure("telegram outbound bridge failed", {
			roomId: Number(room.id),
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function ingestTelegramMessage(env, { mapping, telegramMessage }) {
	const response = await submitExternalRoomMessage(env, {
		room: {
			id: mapping.channelId,
			kind: "public",
			name: mapping.channelName,
		},
		content: telegramMessage.content,
		source: "telegram",
		sourceMessageId: telegramMessage.sourceMessageId,
		externalSender: telegramMessage.sender,
	});
	if (!response.ok) {
		throw new Error(`Telegram 入站消息提交失败：${response.status}`);
	}
	return response.json();
}
