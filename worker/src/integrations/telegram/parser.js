function displayName(user) {
	const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
	return name || user?.username || `Telegram ${user?.id || "用户"}`;
}

export function parseTelegramMessageUpdate(update) {
	const message = update?.message;
	if (
		!message?.chat ||
		!message?.from ||
		message.from.is_bot ||
		typeof message.text !== "string"
	) {
		return null;
	}
	if (!Number.isInteger(Number(message.message_id))) {
		return null;
	}
	if (!message.text.trim()) {
		return null;
	}

	return {
		telegramChatId: String(message.chat.id),
		telegramChatTitle: message.chat.title || message.chat.username || "",
		sourceMessageId: `${message.chat.id}:${message.message_id}`,
		content: message.text,
		sender: {
			id: String(message.from.id),
			displayName: displayName(message.from),
			avatarUrl: "",
		},
	};
}
