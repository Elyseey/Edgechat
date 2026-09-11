import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
	deleteMessageById,
	getMessageDeletionTarget,
} from '../worker/src/data/messages.js';

function read(relativePath) {
	return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function createFakeDb({ referenced = false } = {}) {
	const queries = [];
	const deletedRows = [];
	return {
		queries,
		deletedRows,
		prepare(sql) {
			queries.push(sql);
			return {
				bind(...bindings) {
					return {
						async all() {
							if (sql.includes('FROM messages m') && sql.includes('channel_kind')) {
								return {
									results: [{
										id: 8,
										channel_id: 3,
										sender_id: 7,
										attachment_key: '7/voice.webm',
										channel_kind: 'dm',
									}],
								};
							}
							if (sql.includes('FROM (')) {
								return { results: referenced ? [{ found: 1 }] : [] };
							}
							return { results: [] };
						},
						async run() {
							if (sql.includes('DELETE FROM messages')) {
								return { meta: { changes: 1 } };
							}
							if (sql.includes('DELETE FROM uploaded_files')) {
								deletedRows.push({ table: 'uploaded_files', bindings });
							}
							if (sql.includes('DELETE FROM pending_r2_delete')) {
								deletedRows.push({ table: 'pending_r2_delete', bindings });
							}
							return { meta: { changes: 1 } };
						},
					};
				},
			};
		},
		async batch() {},
	};
}

test('消息删除目标同时返回频道类型和附件 key', async () => {
	const db = createFakeDb();
	const target = await getMessageDeletionTarget(db, 8);

	assert.deepEqual(target, {
		id: 8,
		channel_id: 3,
		sender_id: 7,
		attachment_key: '7/voice.webm',
		channel_kind: 'dm',
	});
});

test('删除消息会清理未被其他资源引用的 R2 对象', async () => {
	const db = createFakeDb();
	const deletedKeys = [];
	const target = await deleteMessageById({
		DB: db,
		FILES: { async delete(key) { deletedKeys.push(key); } },
	}, 8);

	assert.equal(target.id, 8);
	assert.deepEqual(deletedKeys, ['7/voice.webm']);
	assert.deepEqual(db.deletedRows, [
		{ table: 'uploaded_files', bindings: ['7/voice.webm'] },
		{ table: 'pending_r2_delete', bindings: ['7/voice.webm'] },
	]);
});

test('仍有其他活跃引用时删除消息不会删除 R2 对象', async () => {
	const db = createFakeDb({ referenced: true });
	const deletedKeys = [];
	await deleteMessageById({
		DB: db,
		FILES: { async delete(key) { deletedKeys.push(key); } },
	}, 8);

	assert.deepEqual(deletedKeys, []);
	assert.deepEqual(db.deletedRows, []);
});

test('消息删除接口和前端删除入口均已声明', () => {
	const apiSource = read('../worker/src/api/messages.js');
	const clientSource = read('../frontend/src/api.js');
	const roomSource = read('../frontend/src/composables/useChatRoom.js');

	assert.match(apiSource, /app\.delete\('\/api\/messages\/:messageId'/);
	assert.match(apiSource, /只能删除自己发送的消息/);
	assert.match(clientSource, /deleteMessage\(messageId\)/);
	assert.match(roomSource, /message_deleted/);
});
