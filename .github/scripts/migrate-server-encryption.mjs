#!/usr/bin/env node

import { randomUUID, timingSafeEqual } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  decryptAttachment,
  decryptMessageContent,
  encryptAttachment,
  encryptMessageContent,
  getAttachmentEnvelopeKeyId,
  getMessageEnvelopeKeyId,
  isEncryptedAttachment,
  isEncryptedMessageContent,
  loadEncryptionKeyring
} from '../../worker/src/encryption.js';

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 200;

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function byteArraysEqual(left, right) {
  const leftBytes = left instanceof Uint8Array ? left : new Uint8Array(left);
  const rightBytes = right instanceof Uint8Array ? right : new Uint8Array(right);
  return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
}

export async function prepareMessageMigration(keyringSource, row) {
  const keyring = loadEncryptionKeyring(keyringSource);
  const currentKeyId = getMessageEnvelopeKeyId(row.content);
  if (isEncryptedMessageContent(row.content) && currentKeyId === keyring.activeKeyId) {
    await decryptMessageContent(keyringSource, row.content, {
      channelId: row.channel_id,
      senderId: row.sender_id
    });
    return { changed: false, content: row.content, keyId: currentKeyId };
  }

  const plaintext = await decryptMessageContent(keyringSource, row.content, {
    channelId: row.channel_id,
    senderId: row.sender_id
  });
  const content = await encryptMessageContent(keyringSource, plaintext, {
    channelId: row.channel_id,
    senderId: row.sender_id
  });
  return { changed: true, content, keyId: keyring.activeKeyId };
}

export async function prepareAttachmentMigration(keyringSource, value, objectKey) {
  const keyring = loadEncryptionKeyring(keyringSource);
  const currentKeyId = isEncryptedAttachment(value) ? getAttachmentEnvelopeKeyId(value) : null;
  const decrypted = await decryptAttachment(keyringSource, value, objectKey);
  if (decrypted.encrypted && currentKeyId === keyring.activeKeyId) {
    return { changed: false, bytes: new Uint8Array(value), keyId: currentKeyId };
  }

  const bytes = await encryptAttachment(keyringSource, decrypted.bytes, objectKey);
  const verified = await decryptAttachment(keyringSource, bytes, objectKey);
  if (!byteArraysEqual(verified.bytes, decrypted.bytes)) {
    throw new Error(`Attachment verification failed: ${objectKey}`);
  }
  return { changed: true, bytes, keyId: keyring.activeKeyId };
}

function runWrangler(args, { allowFailure = false } = {}) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(executable, ['wrangler', ...args], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      `Wrangler command failed (${args.join(' ')}): ${String(result.stderr || result.stdout).trim()}`
    );
  }
  return result;
}

function parseD1Results(stdout) {
  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    throw new Error(`Unable to parse Wrangler D1 JSON output: ${stdout.slice(0, 500)}`);
  }
  const statement = Array.isArray(payload) ? payload[0] : payload;
  if (!statement?.success && statement?.success !== undefined) {
    throw new Error('D1 query reported failure');
  }
  return Array.isArray(statement?.results) ? statement.results : [];
}

function createWranglerClient({ databaseName, bucketName, configPath, workDirectory }) {
  const commonConfig = ['--config', configPath];

  return {
    query(sql) {
      const result = runWrangler([
        'd1',
        'execute',
        databaseName,
        '--remote',
        '--command',
        sql,
        '--json',
        ...commonConfig
      ]);
      return parseD1Results(result.stdout);
    },
    executeSqlFile(sql, label) {
      const filePath = join(workDirectory, `${label}-${randomUUID()}.sql`);
      writeFileSync(filePath, sql, { encoding: 'utf8', mode: 0o600 });
      runWrangler([
        'd1',
        'execute',
        databaseName,
        '--remote',
        '--file',
        filePath,
        '--yes',
        ...commonConfig
      ]);
    },
    getObject(objectKey, destination) {
      runWrangler([
        'r2',
        'object',
        'get',
        `${bucketName}/${objectKey}`,
        '--remote',
        '--file',
        destination,
        ...commonConfig
      ]);
    },
    putObject(objectKey, source) {
      runWrangler([
        'r2',
        'object',
        'put',
        `${bucketName}/${objectKey}`,
        '--remote',
        '--file',
        source,
        '--content-type',
        'application/octet-stream',
        '--cache-control',
        'private, no-store',
        '--force',
        ...commonConfig
      ]);
    },
    deleteObject(objectKey, allowFailure = false) {
      runWrangler(
        ['r2', 'object', 'delete', `${bucketName}/${objectKey}`, '--remote', ...commonConfig],
        { allowFailure }
      );
    }
  };
}

async function migrateMessages(client, keyringSource, batchSize) {
  let cursor = 0;
  let scanned = 0;
  let changed = 0;

  while (true) {
    const rows = client.query(
      `SELECT id, channel_id, sender_id, content
       FROM messages
       WHERE id > ${cursor}
         AND content != ''
       ORDER BY id ASC
       LIMIT ${batchSize}`
    );
    if (rows.length === 0) {
      break;
    }

    const updates = [];
    for (const row of rows) {
      const prepared = await prepareMessageMigration(keyringSource, row);
      scanned += 1;
      if (prepared.changed) {
        updates.push(`UPDATE messages SET content = ${sqlLiteral(prepared.content)} WHERE id = ${Number(row.id)};`);
        changed += 1;
      }
    }
    if (updates.length > 0) {
      client.executeSqlFile(`${updates.join('\n')}\n`, 'messages');
    }
    cursor = Number(rows.at(-1).id);
    console.log(`Messages: scanned=${scanned}, encrypted-or-rotated=${changed}, cursor=${cursor}`);
  }

  return { scanned, changed };
}

function markAttachmentState(client, objectKey, keyId) {
  client.executeSqlFile(
    `INSERT INTO encryption_migration_state (resource_type, resource_key, key_id, migrated_at)
     VALUES ('attachment', ${sqlLiteral(objectKey)}, ${sqlLiteral(keyId)}, CURRENT_TIMESTAMP)
     ON CONFLICT(resource_type, resource_key) DO UPDATE
     SET key_id = excluded.key_id, migrated_at = CURRENT_TIMESTAMP;\n`,
    'attachment-state'
  );
}

async function migrateAttachment(client, keyringSource, row, workDirectory) {
  const objectKey = String(row.object_key);
  const sourcePath = join(workDirectory, `source-${randomUUID()}.bin`);
  const encryptedPath = join(workDirectory, `encrypted-${randomUUID()}.bin`);
  const verificationPath = join(workDirectory, `verification-${randomUUID()}.bin`);
  const sidecarKey = `__edgechat_encryption_migration/${objectKey}.${randomUUID()}`;

  client.getObject(objectKey, sourcePath);
  const sourceBytes = new Uint8Array(readFileSync(sourcePath));
  const prepared = await prepareAttachmentMigration(keyringSource, sourceBytes, objectKey);
  if (!prepared.changed) {
    markAttachmentState(client, objectKey, prepared.keyId);
    return false;
  }

  writeFileSync(encryptedPath, prepared.bytes, { mode: 0o600 });
  try {
    client.putObject(sidecarKey, encryptedPath);
    client.getObject(sidecarKey, verificationPath);
    const sidecarBytes = new Uint8Array(readFileSync(verificationPath));
    const verifiedSidecar = await decryptAttachment(keyringSource, sidecarBytes, objectKey);
    const originalPlaintext = await decryptAttachment(keyringSource, sourceBytes, objectKey);
    if (!byteArraysEqual(verifiedSidecar.bytes, originalPlaintext.bytes)) {
      throw new Error(`R2 sidecar verification failed: ${objectKey}`);
    }

    client.putObject(objectKey, verificationPath);
    rmSync(verificationPath, { force: true });
    client.getObject(objectKey, verificationPath);
    const storedBytes = new Uint8Array(readFileSync(verificationPath));
    const verifiedStored = await decryptAttachment(keyringSource, storedBytes, objectKey);
    if (!byteArraysEqual(verifiedStored.bytes, originalPlaintext.bytes)) {
      throw new Error(`R2 replacement verification failed: ${objectKey}`);
    }
    markAttachmentState(client, objectKey, prepared.keyId);
    return true;
  } finally {
    client.deleteObject(sidecarKey, true);
  }
}

async function migrateAttachments(client, keyringSource, activeKeyId, batchSize, workDirectory) {
  let scanned = 0;
  let changed = 0;

  while (true) {
    const rows = client.query(
      `SELECT uf.object_key
       FROM uploaded_files uf
       LEFT JOIN encryption_migration_state ems
         ON ems.resource_type = 'attachment'
        AND ems.resource_key = uf.object_key
       WHERE ems.key_id IS NULL OR ems.key_id != ${sqlLiteral(activeKeyId)}
       ORDER BY uf.object_key ASC
       LIMIT ${batchSize}`
    );
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const didChange = await migrateAttachment(client, keyringSource, row, workDirectory);
      scanned += 1;
      changed += didChange ? 1 : 0;
      console.log(
        `Attachments: scanned=${scanned}, encrypted-or-rotated=${changed}, current=${row.object_key}`
      );
    }
  }

  return { scanned, changed };
}

function verifyMigrationComplete(client, activeKeyId) {
  const messageRows = client.query(
    `SELECT COUNT(*) AS remaining
     FROM messages
     WHERE content != ''
       AND content NOT GLOB ${sqlLiteral(`edgechat:enc:v1:${activeKeyId}:*`)}`
  );
  const attachmentRows = client.query(
    `SELECT COUNT(*) AS remaining
     FROM uploaded_files uf
     LEFT JOIN encryption_migration_state ems
       ON ems.resource_type = 'attachment'
      AND ems.resource_key = uf.object_key
     WHERE ems.key_id IS NULL OR ems.key_id != ${sqlLiteral(activeKeyId)}`
  );
  const remaining = {
    messages: Number(messageRows[0]?.remaining || 0),
    attachments: Number(attachmentRows[0]?.remaining || 0)
  };
  if (remaining.messages !== 0 || remaining.attachments !== 0) {
    throw new Error(`Encryption migration is incomplete: ${JSON.stringify(remaining)}`);
  }
  return remaining;
}
async function main() {
  if (process.env.EDGECHAT_ENCRYPTION_MIGRATION_CONFIRM !== 'BACKUP_COMPLETED') {
    throw new Error(
      'Refusing to overwrite historical data: set EDGECHAT_ENCRYPTION_MIGRATION_CONFIRM=BACKUP_COMPLETED after backing up D1 and R2'
    );
  }

  const keyringSource = requiredEnv('EDGECHAT_ENCRYPTION_KEYRING');
  const keyring = loadEncryptionKeyring(keyringSource);
  const databaseName = requiredEnv('EDGECHAT_D1_DATABASE_NAME');
  const bucketName = requiredEnv('EDGECHAT_R2_BUCKET_NAME');
  const configPath = requiredEnv('EDGECHAT_WRANGLER_CONFIG');
  const requestedBatchSize = Number(process.env.EDGECHAT_ENCRYPTION_BATCH_SIZE || DEFAULT_BATCH_SIZE);
  const batchSize = Math.min(
    MAX_BATCH_SIZE,
    Math.max(1, Number.isFinite(requestedBatchSize) ? Math.floor(requestedBatchSize) : DEFAULT_BATCH_SIZE)
  );
  const workDirectory = mkdtempSync(join(tmpdir(), 'edgechat-encryption-'));

  try {
    const client = createWranglerClient({ databaseName, bucketName, configPath, workDirectory });
    client.executeSqlFile(
      readFileSync('worker/migrations/2026-08-10-server-encryption.sql', 'utf8'),
      'schema'
    );
    console.log(`Starting server encryption migration with active key ${keyring.activeKeyId}`);
    const messages = await migrateMessages(client, keyringSource, batchSize);
    const attachments = await migrateAttachments(
      client,
      keyringSource,
      keyring.activeKeyId,
      batchSize,
      workDirectory
    );
    const remainingNonActive = verifyMigrationComplete(client, keyring.activeKeyId);
    console.log(
      JSON.stringify({ activeKeyId: keyring.activeKeyId, messages, attachments, remainingNonActive })
    );
  } finally {
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
