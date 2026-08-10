import assert from 'node:assert/strict';
import test from 'node:test';
import { Hono } from 'hono';
import { registerAdminRoutes } from './api/admin.js';
import { encryptMessageContent } from './encryption.js';

const keyring = JSON.stringify({
  activeKeyId: 'v1',
  keys: {
    v1: Buffer.from(Uint8Array.from({ length: 32 }, (_, index) => index + 10)).toString('base64')
  }
});

test('admin keyword search decrypts candidates and reports the scan boundary', async () => {
  const encrypted = await encryptMessageContent(keyring, 'contains Needle securely', {
    channelId: 7,
    senderId: 42
  });
  const row = {
    id: 1,
    content: encrypted,
    attachment_name: null,
    created_at: '2026-08-10 12:00:00',
    channel_id: 7,
    channel_name: 'Room',
    channel_kind: 'private',
    sender_id: 42,
    sender_display_name: 'Tester',
    sender_username: 'tester'
  };
  let queryBinds = null;
  const db = {
    prepare() {
      return {
        bind(...values) {
          queryBinds = values;
          return {
            async all() {
              return { results: Array.from({ length: 5001 }, () => row) };
            }
          };
        }
      };
    }
  };
  const app = new Hono();
  registerAdminRoutes(app);

  const response = await app.request(
    'https://edgechat.test/api/admin/messages/search?keyword=needle&limit=1',
    {},
    { DB: db, EDGECHAT_ENCRYPTION_KEYRING: keyring }
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(queryBinds, [5001]);
  assert.equal(payload.messages.length, 1);
  assert.equal(payload.messages[0].content, 'contains Needle securely');
  assert.equal(payload.scannedCount, 5000);
  assert.equal(payload.searchTruncated, true);
});
