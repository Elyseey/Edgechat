import { encryptMessageContent, isEncryptedMessageContent } from "./encryption.js";

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_BATCHES = 20;

export async function migrateLegacyMessageBatch(env, limit = DEFAULT_BATCH_SIZE) {
	const batchSize = Math.max(1, Math.min(Number(limit) || DEFAULT_BATCH_SIZE, 500));
	const { results } = await env.DB.prepare(
		`SELECT id, channel_id, sender_id, content
		 FROM messages
		 WHERE content != ''
		   AND content NOT LIKE 'edgechat:enc:v1:%'
		 ORDER BY id ASC
		 LIMIT ?`,
	)
		.bind(batchSize)
		.all();

	let migratedCount = 0;
	for (const row of results) {
		if (isEncryptedMessageContent(row.content)) continue;
		const encrypted = await encryptMessageContent(env, row.content, {
			channelId: row.channel_id,
			senderId: row.sender_id,
		});
		const result = await env.DB.prepare(
			`UPDATE messages SET content = ?
			 WHERE id = ? AND content = ?`,
		)
			.bind(encrypted, Number(row.id), row.content)
			.run();
		migratedCount += Number(result.meta?.changes || 0);
	}

	return { candidateCount: results.length, migratedCount };
}

export async function runScheduledMessageEncryptionMigration(env) {
	const batchSize = Math.max(
		1,
		Math.min(Number(env.ENCRYPTION_MIGRATION_BATCH_SIZE) || DEFAULT_BATCH_SIZE, 500),
	);
	const maxBatches = Math.max(
		1,
		Math.min(Number(env.ENCRYPTION_MIGRATION_MAX_BATCHES || DEFAULT_MAX_BATCHES), 100),
	);
	let migratedCount = 0;
	for (let batch = 0; batch < maxBatches; batch += 1) {
		const result = await migrateLegacyMessageBatch(env, batchSize);
		migratedCount += result.migratedCount;
		if (result.candidateCount < batchSize) break;
	}
	return { migratedCount };
}
