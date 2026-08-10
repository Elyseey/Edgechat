import assert from 'node:assert/strict';
import test from 'node:test';
import {
  prepareAttachmentMigration,
  prepareMessageMigration
} from '../../.github/scripts/migrate-server-encryption.mjs';
import { decryptAttachment, decryptMessageContent, encryptAttachment } from './encryption.js';

function encodedKey(seed) {
  return Buffer.from(Uint8Array.from({ length: 32 }, (_, index) => (seed + index) % 256)).toString(
    'base64'
  );
}

function keyring(activeKeyId) {
  return JSON.stringify({
    activeKeyId,
    keys: { v1: encodedKey(1), v2: encodedKey(101) }
  });
}

test('message migration encrypts plaintext, is idempotent, and rotates keys', async () => {
  const row = { id: 1, channel_id: 10, sender_id: 20, content: 'legacy message' };
  const first = await prepareMessageMigration(keyring('v1'), row);
  assert.equal(first.changed, true);
  assert.equal(first.content.includes('legacy message'), false);

  const repeated = await prepareMessageMigration(keyring('v1'), { ...row, content: first.content });
  assert.equal(repeated.changed, false);

  const rotated = await prepareMessageMigration(keyring('v2'), { ...row, content: first.content });
  assert.equal(rotated.changed, true);
  assert.equal(rotated.keyId, 'v2');
  assert.equal(
    await decryptMessageContent(keyring('v2'), rotated.content, {
      channelId: row.channel_id,
      senderId: row.sender_id
    }),
    row.content
  );
});

test('attachment migration encrypts plaintext, is idempotent, and rotates keys', async () => {
  const objectKey = '20/example.bin';
  const plaintext = Uint8Array.from([0, 1, 2, 128, 255]);
  const first = await prepareAttachmentMigration(keyring('v1'), plaintext, objectKey);
  assert.equal(first.changed, true);

  const repeated = await prepareAttachmentMigration(keyring('v1'), first.bytes, objectKey);
  assert.equal(repeated.changed, false);

  const oldEncrypted = await encryptAttachment(keyring('v1'), plaintext, objectKey);
  const rotated = await prepareAttachmentMigration(keyring('v2'), oldEncrypted, objectKey);
  assert.equal(rotated.changed, true);
  assert.equal(rotated.keyId, 'v2');
  assert.deepEqual((await decryptAttachment(keyring('v2'), rotated.bytes, objectKey)).bytes, plaintext);
});
