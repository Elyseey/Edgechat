import assert from "node:assert/strict";
import test from "node:test";

import { insertExternalMessage, mapMessage } from "../worker/src/data/messages.js";
import {
	decryptAttachment,
	decryptMessageContent,
	decryptSecretValue,
	encryptMessageContent,
	encryptSecretValue,
} from "../worker/src/encryption.js";
import { parseTelegramMessageUpdate } from "../worker/src/integrations/telegram/parser.js";
import {
	formatTelegramMessage,
	splitTelegramFormattedMessage,
} from "../worker/src/integrations/telegram/bridge.js";
import { sendTelegramMedia } from "../worker/src/integrations/telegram/client.js";
import {
	importTelegramAttachment,
	TELEGRAM_BRIDGE_FILE_LIMIT,
} from "../worker/src/integrations/telegram/files.js";
import worker from "../worker/src/index.js";

const keyring = JSON.stringify({
	activeKeyId: "v1",
	keys: {
		v1: Buffer.from(Uint8Array.from({ length: 32 }, (_, index) => index + 1)).toString(
			"base64",
		),
	},
});

test("Telegram 文字消息转换为稳定的外部发送者模型", () => {
	assert.deepEqual(
		parseTelegramMessageUpdate({
			message: {
				message_id: 9,
				text: "hello 👋",
				chat: { id: -100123, title: "Bridge room" },
				from: { id: 42, first_name: "Alice", last_name: "Chen", is_bot: false },
			},
		}),
		{
				telegramChatId: "-100123",
				telegramChatTitle: "Bridge room",
				telegramMessageId: 9,
				sourceMessageId: "-100123:9",
				content: "hello 👋",
				attachment: null,
			sender: { id: "42", displayName: "Alice Chen", avatarUrl: "" },
		},
	);
	assert.equal(parseTelegramMessageUpdate({ message: { text: "bot", from: { is_bot: true } } }), null);
});

test("Telegram 图片、视频与普通文件保留原始元数据", () => {
	const base = {
		message_id: 10,
		caption: "说明",
		chat: { id: -100123, title: "Bridge room" },
		from: { id: 42, first_name: "Alice", is_bot: false },
	};
	const photo = parseTelegramMessageUpdate({
		message: {
			...base,
			photo: [
				{ file_id: "small", file_unique_id: "small-u", file_size: 100 },
				{ file_id: "large", file_unique_id: "large-u", file_size: 200 },
			],
		},
	});
	assert.deepEqual(photo.attachment, {
		kind: "photo",
		fileId: "large",
		fileUniqueId: "large-u",
		fileName: "photo-10.jpg",
		mimeType: "image/jpeg",
		fileSize: 200,
	});
	const video = parseTelegramMessageUpdate({
		message: {
			...base,
			video: {
				file_id: "video",
				file_unique_id: "video-u",
				file_name: "clip.mp4",
				mime_type: "video/mp4",
				file_size: 300,
			},
		},
	});
	assert.equal(video.attachment.kind, "video");
	assert.equal(video.attachment.fileName, "clip.mp4");
	const document = parseTelegramMessageUpdate({
		message: {
			...base,
			document: {
				file_id: "document",
				file_unique_id: "document-u",
				file_name: "report.pdf",
				mime_type: "application/pdf",
				file_size: 400,
			},
		},
	});
	assert.equal(document.attachment.kind, "document");
	assert.equal(document.content, "说明");
});

test("EdgeChat 出站消息使用粗体用户名、空行和 HTML 转义", () => {
	assert.equal(
		formatTelegramMessage('Alice & Bob', '<hello> "world"'),
		'<b>Alice &amp; Bob:</b>\n\n&lt;hello&gt; &quot;world&quot;',
	);
	const chunks = splitTelegramFormattedMessage("Alice", `${"a".repeat(4080)}👋b`, 4096);
	assert.equal(chunks.length, 2);
	assert.equal(Array.from(chunks[0]).length <= 4096, true);
	assert.equal(chunks[0].endsWith("👋"), true);
	assert.equal(chunks[1], "<b>Alice:</b>\n\nb");
});

test("Telegram 媒体上传按类型构造 multipart 请求", async () => {
	const originalFetch = globalThis.fetch;
	let captured;
	globalThis.fetch = async (url, init) => {
		captured = { url, init };
		return Response.json({ ok: true, result: { message_id: 1 } });
	};
	try {
		await sendTelegramMedia("123:token", {
			chatId: "-1001",
			kind: "video",
			bytes: Uint8Array.from([1, 2, 3]),
			filename: "clip.mp4",
			contentType: "video/mp4",
			caption: "<b>Alice:</b>\n\nhello",
		});
	} finally {
		globalThis.fetch = originalFetch;
	}
	assert.match(captured.url, /\/sendVideo$/);
	assert.equal(captured.init.method, "POST");
	assert.equal(captured.init.headers, undefined);
	assert.equal(captured.init.body.get("chat_id"), "-1001");
	assert.equal(captured.init.body.get("parse_mode"), "HTML");
	assert.equal(captured.init.body.get("caption"), "<b>Alice:</b>\n\nhello");
	assert.equal(captured.init.body.get("video").name, "clip.mp4");
});

test("Telegram 入站附件下载后加密写入 R2，超限时不下载", async () => {
	const originalFetch = globalThis.fetch;
	const writes = [];
	let fetchCount = 0;
	globalThis.fetch = async (url) => {
		fetchCount += 1;
		if (String(url).includes("/getFile")) {
			return Response.json({ ok: true, result: { file_path: "documents/a.bin", file_size: 4 } });
		}
		return new Response(Uint8Array.from([1, 2, 3, 4]), {
			headers: { "content-length": "4" },
		});
	};
	const env = {
		EDGECHAT_ENCRYPTION_KEYRING: keyring,
		FILES: {
			async put(key, value, options) {
				writes.push({ key, value, options });
			},
		},
	};
	let imported;
	try {
		imported = await importTelegramAttachment(env, {
			botToken: "123:token",
			telegramChatId: "-1001",
			telegramMessageId: 9,
			attachment: {
				fileId: "file-id",
				fileName: "a.bin",
				mimeType: "application/octet-stream",
				fileSize: 4,
			},
		});
	} finally {
		globalThis.fetch = originalFetch;
	}
	assert.equal(fetchCount, 2);
	assert.match(imported.attachment.key, /^telegram\/-1001\/9-[0-9a-f-]+\.bin$/);
	assert.equal(writes.length, 1);
	assert.deepEqual(
		(await decryptAttachment(env, writes[0].value, writes[0].key)).bytes,
		Uint8Array.from([1, 2, 3, 4]),
	);
	const oversized = await importTelegramAttachment(env, {
		botToken: "123:token",
		telegramChatId: "-1001",
		telegramMessageId: 10,
		attachment: { fileId: "large", fileSize: TELEGRAM_BRIDGE_FILE_LIMIT + 1 },
	});
	assert.deepEqual(oversized, { attachment: null, oversized: true });
});

test("可信 Telegram 外部消息可以直接引用 Bridge 创建的 R2 附件", async () => {
	let insertBinds;
	const env = {
		EDGECHAT_ENCRYPTION_KEYRING: keyring,
		DB: {
			prepare(sql) {
				if (sql.includes("uploaded_files")) {
					throw new Error("外部附件不应伪造本地上传归属");
				}
				return {
					bind(...binds) {
						return {
							async run() {
								insertBinds = binds;
								return { meta: { last_row_id: 5 } };
							},
							async all() {
								return {
									results: [{
										id: 5,
										channel_id: 7,
										content: insertBinds[2],
										attachment_key: "telegram/-1001/9-a.bin",
										attachment_name: "a.bin",
										attachment_type: "application/octet-stream",
										attachment_size: 4,
										sender_kind: "external",
										external_sender_id: "42",
										external_sender_name: "Alice",
										source: "telegram",
										source_message_id: "-1001:9",
										created_at: "now",
									}],
								};
							},
						};
					},
				};
			},
		},
	};
	const result = await insertExternalMessage(env, {
		channelId: 7,
		content: "caption",
		attachment: {
			key: "telegram/-1001/9-a.bin",
			name: "a.bin",
			type: "application/octet-stream",
			size: 4,
		},
		externalSender: { id: "42", displayName: "Alice", avatarUrl: "" },
		source: "telegram",
		sourceMessageId: "-1001:9",
		sourceAttachmentId: "file-id",
		sourceAttachmentUniqueId: "unique-id",
	});

	assert.equal(result.created, true);
	assert.equal(result.message.attachment.key, "telegram/-1001/9-a.bin");
	assert.equal(insertBinds[13], "file-id");
	assert.equal(insertBinds[14], "unique-id");
});

test("Bot Token 与 Webhook Secret 使用用途绑定的服务端密文", async () => {
	const env = { EDGECHAT_ENCRYPTION_KEYRING: keyring };
	const encrypted = await encryptSecretValue(env, "123:token", "telegram:bot-token");
	assert.equal(encrypted.includes("123:token"), false);
	assert.equal(await decryptSecretValue(env, encrypted, "telegram:bot-token"), "123:token");
	await assert.rejects(
		decryptSecretValue(env, encrypted, "telegram:webhook-secret"),
		/Encrypted secret authentication failed/,
	);
});

test("外部消息密文绑定来源和外部用户 ID", async () => {
	const env = { EDGECHAT_ENCRYPTION_KEYRING: keyring };
	const encrypted = await encryptMessageContent(env, "telegram message", {
		channelId: 7,
		senderId: 0,
		senderContext: "telegram:42",
	});
	assert.match(encrypted, /^edgechat:enc:v2:/);
	assert.equal(
		await decryptMessageContent(env, encrypted, {
			channelId: 7,
			senderId: 0,
			senderContext: "telegram:42",
		}),
		"telegram message",
	);
	await assert.rejects(
		decryptMessageContent(env, encrypted, {
			channelId: 7,
			senderId: 0,
			senderContext: "telegram:99",
		}),
		/Encrypted message authentication failed/,
	);
});

test("消息 projection 保留 Telegram 来源而不伪造 EdgeChat 账号", () => {
	assert.deepEqual(
		mapMessage({
			id: 12,
			content: "hello",
			created_at: "now",
			sender_kind: "external",
			external_sender_id: "42",
			external_sender_name: "Alice",
			external_sender_avatar_url: null,
			source: "telegram",
		}),
		{
			id: 12,
			content: "hello",
			createdAt: "now",
			source: "telegram",
			sender: {
				kind: "external",
				id: "42",
				username: "",
				displayName: "Alice",
				avatarUrl: "",
				source: "telegram",
			},
			attachment: null,
		},
	);
});

test("Telegram webhook 公开接收而后台配置仍要求登录", async () => {
	const env = {
		DB: {
			prepare() {
				return {
					bind() {
						return this;
					},
					async all() {
						return { results: [] };
					},
				};
			},
		},
		SESSIONS: {
			async get() {
				return null;
			},
		},
	};
	const webhookResponse = await worker.fetch(
		new Request("https://example.com/api/integrations/telegram/webhook", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}",
		}),
		env,
		{},
	);
	const adminResponse = await worker.fetch(
		new Request("https://example.com/api/admin/telegram"),
		env,
		{},
	);

	assert.equal(webhookResponse.status, 503);
	assert.deepEqual(await webhookResponse.json(), { error: "Telegram Bridge 未配置" });
	assert.equal(adminResponse.status, 401);
	assert.deepEqual(await adminResponse.json(), { error: "请先登录" });
});
