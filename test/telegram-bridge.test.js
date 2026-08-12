import assert from "node:assert/strict";
import test from "node:test";

import { mapMessage } from "../worker/src/data/messages.js";
import {
	decryptMessageContent,
	decryptSecretValue,
	encryptMessageContent,
	encryptSecretValue,
} from "../worker/src/encryption.js";
import { parseTelegramMessageUpdate } from "../worker/src/integrations/telegram/parser.js";
import { splitTelegramText } from "../worker/src/integrations/telegram/bridge.js";
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
			sourceMessageId: "-100123:9",
			content: "hello 👋",
			sender: { id: "42", displayName: "Alice Chen", avatarUrl: "" },
		},
	);
	assert.equal(parseTelegramMessageUpdate({ message: { text: "bot", from: { is_bot: true } } }), null);
});

test("EdgeChat 长文本按 Unicode 字符切分到 Telegram 单条上限", () => {
	const chunks = splitTelegramText(`${"a".repeat(4095)}👋b`);
	assert.equal(chunks.length, 2);
	assert.equal(Array.from(chunks[0]).length, 4096);
	assert.equal(chunks[0].endsWith("👋"), true);
	assert.equal(chunks[1], "b");
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
