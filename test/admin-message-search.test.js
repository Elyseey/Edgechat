import assert from 'node:assert/strict';
import test from 'node:test';
import { Hono } from 'hono';

import { registerAdminRoutes } from '../worker/src/api/admin.js';
import { searchAdminMessages } from '../worker/src/data/admin-message-search.js';

function createSearchDb(results = []) {
  const capture = { sql: '', binds: [], prepareCount: 0 };
  return {
    capture,
    db: {
      prepare(sql) {
        capture.prepareCount += 1;
        capture.sql = sql;
        return {
          bind(...binds) {
            capture.binds = binds;
            return this;
          },
          async all() {
            return { results };
          }
        };
      }
    }
  };
}

function createAdminSearchApp(db) {
  const app = new Hono();
  registerAdminRoutes(app);
  return (path) => app.fetch(new Request(`https://example.com${path}`), { DB: db });
}

test('消息搜索未提供可选筛选时不会绑定不存在的零 ID', async () => {
  const { db, capture } = createSearchDb([]);
  const response = await createAdminSearchApp(db)('/api/admin/messages/search');

  assert.equal(response.status, 200);
  assert.doesNotMatch(capture.sql, /c\.id = \?/);
  assert.doesNotMatch(capture.sql, /u\.id = \?/);
  assert.deepEqual(capture.binds, [50]);
});

test('两名用户搜索使用排序后的私信键且只查询私信频道', async () => {
  const { db, capture } = createSearchDb([
    {
      id: '7',
      content: 'hello',
      attachment_name: null,
      created_at: '2026-07-29 10:00:00',
      channel_id: '12',
      channel_name: '2:9',
      channel_kind: 'dm',
      sender_id: '9',
      sender_display_name: 'Bob',
      sender_username: 'bob'
    }
  ]);

  const messages = await searchAdminMessages(db, {
    dmUserIds: [9, 2],
    limit: 80
  });

  assert.match(capture.sql, /c\.kind = 'dm'/);
  assert.match(capture.sql, /c\.dm_key = \?/);
  assert.deepEqual(capture.binds, ['2:9', 80]);
  assert.deepEqual(messages[0], {
    id: 7,
    content: 'hello',
    attachmentName: null,
    createdAt: '2026-07-29 10:00:00',
    room: { id: 12, name: '2:9', kind: 'dm' },
    sender: { id: 9, username: 'bob', displayName: 'Bob' }
  });
});

test('两人私信搜索要求两个不同的有效用户', async () => {
  const missingDb = createSearchDb([]);
  const missingResponse = await createAdminSearchApp(missingDb.db)(
    '/api/admin/messages/search?firstUserId=2'
  );
  assert.equal(missingResponse.status, 400);
  assert.deepEqual(await missingResponse.json(), { error: '请选择两名用户' });
  assert.equal(missingDb.capture.prepareCount, 0);

  const duplicateDb = createSearchDb([]);
  const duplicateResponse = await createAdminSearchApp(duplicateDb.db)(
    '/api/admin/messages/search?firstUserId=2&secondUserId=2'
  );
  assert.equal(duplicateResponse.status, 400);
  assert.deepEqual(await duplicateResponse.json(), { error: '请选择两名不同的用户' });
  assert.equal(duplicateDb.capture.prepareCount, 0);
});

test('普通筛选保留关键词转义、频道、发送者与类型条件', async () => {
  const { db, capture } = createSearchDb([]);
  await searchAdminMessages(db, {
    keyword: '50%_off\\now',
    channelId: 4,
    userId: 6,
    kind: 'private',
    limit: 25
  });

  assert.match(capture.sql, /m\.content LIKE \? ESCAPE '\\'/);
  assert.match(capture.sql, /c\.id = \?/);
  assert.match(capture.sql, /u\.id = \?/);
  assert.match(capture.sql, /c\.kind = \?/);
  assert.deepEqual(capture.binds, ['%50\\%\\_off\\\\now%', '%50\\%\\_off\\\\now%', 4, 6, 'private', 25]);
});
