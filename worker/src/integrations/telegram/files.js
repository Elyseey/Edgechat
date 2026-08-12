import {
	normalizeContentType,
	safeFilenameExtension,
	sanitizeFilename,
} from "../../attachment-metadata.js";
import { decryptAttachment, encryptAttachment } from "../../encryption.js";
import { downloadTelegramFile, getTelegramFile } from "./client.js";

export const TELEGRAM_BRIDGE_FILE_LIMIT = 16 * 1024 * 1024;
const FILE_RESPONSE_CACHE_CONTROL = "private, no-store";

function telegramObjectKey({ telegramChatId, telegramMessageId, filename }) {
	const extension = safeFilenameExtension(filename);
	return `telegram/${telegramChatId}/${telegramMessageId}-${crypto.randomUUID()}${extension}`;
}

export async function importTelegramAttachment(env, {
	botToken,
	telegramChatId,
	telegramMessageId,
	attachment,
}) {
	if (!attachment) return { attachment: null, oversized: false };
	if (attachment.fileSize > TELEGRAM_BRIDGE_FILE_LIMIT) {
		return { attachment: null, oversized: true };
	}

	const telegramFile = await getTelegramFile(botToken, attachment.fileId);
	const resolvedSize = Number(telegramFile.file_size || attachment.fileSize || 0);
	if (resolvedSize > TELEGRAM_BRIDGE_FILE_LIMIT) {
		return { attachment: null, oversized: true };
	}
	const bytes = await downloadTelegramFile(
		botToken,
		telegramFile.file_path,
		TELEGRAM_BRIDGE_FILE_LIMIT,
	);
	const name = sanitizeFilename(attachment.fileName);
	const type = normalizeContentType(attachment.mimeType) || "application/octet-stream";
	const key = telegramObjectKey({ telegramChatId, telegramMessageId, filename: name });
	// Telegram 只负责传输，正式附件在进入消息前即转换为 EdgeChat 自有加密 R2 对象。
	const encrypted = await encryptAttachment(env, bytes, key);
	await env.FILES.put(key, encrypted, {
		httpMetadata: { contentType: type, cacheControl: FILE_RESPONSE_CACHE_CONTROL },
		customMetadata: { filename: name, edgechatEncryption: "v1", source: "telegram" },
	});
	return {
		attachment: { key, name, type, size: bytes.byteLength },
		oversized: false,
	};
}

export async function loadEdgeChatAttachment(env, attachment) {
	if (!attachment || Number(attachment.size) > TELEGRAM_BRIDGE_FILE_LIMIT) {
		return null;
	}
	const object = await env.FILES.get(attachment.key);
	if (!object) throw new Error("EdgeChat 附件不存在");
	const decrypted = await decryptAttachment(env, await object.arrayBuffer(), attachment.key);
	if (decrypted.bytes.byteLength > TELEGRAM_BRIDGE_FILE_LIMIT) {
		return null;
	}
	return {
		bytes: decrypted.bytes,
		name: sanitizeFilename(attachment.name),
		type: normalizeContentType(attachment.type) || "application/octet-stream",
		size: decrypted.bytes.byteLength,
	};
}

export async function deleteImportedTelegramAttachment(env, attachment) {
	if (!attachment?.key) return;
	try {
		await env.FILES.delete(attachment.key);
	} catch (error) {
		console.warn(JSON.stringify({
			message: "telegram orphan attachment delete failed",
			objectKey: attachment.key,
			error: error instanceof Error ? error.message : String(error),
		}));
	}
}
