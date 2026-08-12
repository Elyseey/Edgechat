const TELEGRAM_API_ROOT = "https://api.telegram.org";

export class TelegramApiError extends Error {
	constructor(message) {
		super(message);
		this.name = "TelegramApiError";
	}
}

export async function callTelegramApi(botToken, method, payload = {}) {
	const token = String(botToken || "").trim();
	if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
		throw new TelegramApiError("Telegram Bot Token 格式无效");
	}
	const response = await fetch(
		`${TELEGRAM_API_ROOT}/bot${token}/${method}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		},
	);
	const result = await response.json().catch(() => null);
	if (!response.ok || !result?.ok) {
		throw new TelegramApiError(result?.description || `Telegram API 请求失败：${response.status}`);
	}
	return result.result;
}

export function getTelegramBot(botToken) {
	return callTelegramApi(botToken, "getMe");
}

export function setTelegramWebhook(botToken, { url, secretToken }) {
	return callTelegramApi(botToken, "setWebhook", {
		url,
		secret_token: secretToken,
		allowed_updates: ["message"],
		drop_pending_updates: false,
	});
}

export function getTelegramChat(botToken, chatId) {
	return callTelegramApi(botToken, "getChat", { chat_id: String(chatId) });
}

export function sendTelegramText(botToken, { chatId, text }) {
	return callTelegramApi(botToken, "sendMessage", {
		chat_id: String(chatId),
		text: String(text),
	});
}
