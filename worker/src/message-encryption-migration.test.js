import assert from "node:assert/strict";
import test from "node:test";
import { isEncryptedMessageContent } from "./encryption.js";
import { migrateLegacyMessageBatch } from "./message-encryption-migration.js";

const keyring = JSON.stringify({
	activeKeyId: "v1",
	keys: { v1: Buffer.alloc(32, 7).toString("base64") },
});

test("legacy D1 messages migrate in an idempotent compare-and-swap batch", async () => {
	const rows = [{ id: 1, channel_id: 3, sender_id: 8, content: "历史消息" }];
	const db = {
		prepare(_sql) {
			return {
				bind(...values) {
					return {
						async all() {
							return { results: rows.filter((row) => !isEncryptedMessageContent(row.content)) };
						},
						async run() {
							const row = rows.find((item) => item.id === values[1] && item.content === values[2]);
							if (!row) return { meta: { changes: 0 } };
							row.content = values[0];
							return { meta: { changes: 1 } };
						},
					};
				},
			};
		},
	};
	const env = { DB: db, EDGECHAT_ENCRYPTION_KEYRING: keyring };
	assert.deepEqual(await migrateLegacyMessageBatch(env), { candidateCount: 1, migratedCount: 1 });
	assert.equal(isEncryptedMessageContent(rows[0].content), true);
	assert.deepEqual(await migrateLegacyMessageBatch(env), { candidateCount: 0, migratedCount: 0 });
});
