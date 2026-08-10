import { hashPassword } from '../auth.js';
import { searchAdminMessages } from '../data/admin-message-search.js';
import { listAdminChannels } from '../data/channels.js';
import { listAdminDms } from '../data/dm-queries.js';
import { ensureGeneralChannelMembership } from '../data/general-channel.js';
import { listMessages } from '../data/messages.js';
import {
  createRegistrationInvite,
  listActiveRegistrationInvites,
  MAX_INVITE_USES,
  revokeRegistrationInvite
} from '../data/registration-invites.js';
import { getSiteSettings, updateSiteSettings } from '../data/site-settings.js';
import { listAdminUsers } from '../data/users.js';
import { authorizeRoom } from '../room-access.js';
import { ApiError } from '../errors.js';
import { errorResponse, parseJsonRequest, randomToken, sanitizeLimit } from '../utils.js';

function parseOptionalPositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

export function registerAdminRoutes(app) {
  app.get('/api/admin/overview', async (c) => {
    const [users, channels, dms, site] = await Promise.all([
      listAdminUsers(c.env.DB),
      // overview 没有头像字段，显式关闭 projection，避免悄然扩大既有响应 interface。
      listAdminChannels(c.env.DB, { includeAvatar: false }),
      listAdminDms(c.env.DB),
      getSiteSettings(c.env.DB)
    ]);

    return c.json({
      site,
      users,
      channels,
      dms
    });
  });

  app.get('/api/admin/site-settings', async (c) => {
    const site = await getSiteSettings(c.env.DB);
    return c.json({ site });
  });

  app.patch('/api/admin/site-settings', async (c) => {
    const payload = await parseJsonRequest(c.req.raw);
    const siteName = String(payload.siteName || '').trim();
    const siteIconUrl = String(payload.siteIconUrl || '').trim();

    if (!siteName) {
      return errorResponse('站点名称不能为空');
    }

    const site = await updateSiteSettings(c.env.DB, { siteName, siteIconUrl });
    return c.json({ site });
  });

  app.get('/api/admin/register-links', async (c) => {
    const invites = await listActiveRegistrationInvites(c.env.DB);
    return c.json({ invites });
  });

  app.post('/api/admin/register-links', async (c) => {
    const session = c.get('session');
    const payload = await parseJsonRequest(c.req.raw);
    const note = String(payload.note || '').trim();
    const maxUses = Number(payload.maxUses ?? 1);

    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > MAX_INVITE_USES) {
      return errorResponse(`可使用次数必须是 1 到 ${MAX_INVITE_USES} 之间的整数`);
    }

    const token = randomToken(24);
    const invite = await createRegistrationInvite(c.env.DB, {
      token,
      note,
      maxUses,
      createdBy: session.userId,
      creatorDisplayName: session.displayName
    });

    return c.json({
      invite
    });
  });

  app.delete('/api/admin/register-links/:inviteId', async (c) => {
    const inviteId = Number(c.req.param('inviteId'));
    if (!Number.isFinite(inviteId)) {
      return errorResponse('注册链接不存在', 404);
    }

    await revokeRegistrationInvite(c.env.DB, inviteId);

    return c.json({ ok: true });
  });

  app.get('/api/admin/users', async (c) => {
    const users = await listAdminUsers(c.env.DB);
    return c.json({ users });
  });

  app.post('/api/admin/users', async (c) => {
    const payload = await parseJsonRequest(c.req.raw);
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '');
    const displayName = String(payload.displayName || username).trim();

    if (!username || !password) {
      return errorResponse('用户名和密码不能为空');
    }

    const hashed = await hashPassword(password);
    const result = await c.env.DB.prepare(
      `INSERT INTO users (
         username,
         display_name,
         password_hash,
         password_salt
       ) VALUES (?, ?, ?, ?)`
    )
      .bind(username, displayName, hashed.hash, hashed.salt)
      .run()
      .catch((error) => {
        if (String(error.message).includes('UNIQUE')) {
          throw new ApiError('用户名已存在');
        }
        throw error;
      });

    await ensureGeneralChannelMembership(c.env.DB, result.meta.last_row_id);

    return c.json({
      user: {
        id: result.meta.last_row_id,
        username,
        displayName,
        isDisabled: false
      }
    });
  });

  app.patch('/api/admin/users/:userId', async (c) => {
    const userId = Number(c.req.param('userId'));
    const payload = await parseJsonRequest(c.req.raw);
    const isDisabled = payload.isDisabled ? 1 : 0;
    const bumpVersion = isDisabled ? 1 : 0;
    await c.env.DB.prepare(
      `UPDATE users
       SET is_disabled = ?,
           display_name = COALESCE(?, display_name),
           session_version = session_version + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND deleted_at IS NULL`
    )
      .bind(isDisabled, payload.displayName || null, bumpVersion, userId)
      .run();

    return c.json({ ok: true });
  });

  app.post('/api/admin/users/:userId/reset-password', async (c) => {
    const userId = Number(c.req.param('userId'));
    const payload = await parseJsonRequest(c.req.raw);
    const password = String(payload.password || '');
    if (!password) {
      return errorResponse('新密码不能为空');
    }

    const hashed = await hashPassword(password);
    await c.env.DB.prepare(
      `UPDATE users
       SET password_hash = ?,
            password_salt = ?,
            session_version = session_version + 1,
            updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND deleted_at IS NULL`
    )
      .bind(hashed.hash, hashed.salt, userId)
      .run();

    return c.json({ ok: true });
  });

  app.delete('/api/admin/users/:userId', async (c) => {
    const userId = Number(c.req.param('userId'));
    await c.env.DB.prepare(
      `UPDATE users
       SET deleted_at = CURRENT_TIMESTAMP,
            is_disabled = 1,
            session_version = session_version + 1,
            updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(userId)
      .run();

    return c.json({ ok: true });
  });

  app.get('/api/admin/messages/search', async (c) => {
    const keyword = String(c.req.query('keyword') || '').trim();
    const channelId = parseOptionalPositiveInteger(c.req.query('channelId'));
    const userId = parseOptionalPositiveInteger(c.req.query('userId'));
    const firstUserId = parseOptionalPositiveInteger(c.req.query('firstUserId'));
    const secondUserId = parseOptionalPositiveInteger(c.req.query('secondUserId'));
    const kind = c.req.query('kind');
    const limit = sanitizeLimit(c.req.query('limit'), 50, 200);

    if ([channelId, userId, firstUserId, secondUserId].some(Number.isNaN)) {
      return errorResponse('搜索参数无效');
    }

    const hasFirstUser = firstUserId !== null;
    const hasSecondUser = secondUserId !== null;
    if (hasFirstUser !== hasSecondUser) {
      return errorResponse('请选择两名用户');
    }

    if (hasFirstUser && firstUserId === secondUserId) {
      return errorResponse('请选择两名不同的用户');
    }

    const dmUserIds = hasFirstUser ? [firstUserId, secondUserId] : null;
    const messages = await searchAdminMessages(c.env.DB, {
      keyword,
      channelId,
      userId,
      kind,
      dmUserIds,
      limit
    });

    return c.json({ messages });
  });

  app.get('/api/admin/rooms/:kind/:roomId/messages', async (c) => {
    const kind = c.req.param('kind');
    const roomId = Number(c.req.param('roomId'));
    const before = c.req.query('before');
    const access = await authorizeRoom(c.env.DB, { isAdmin: true }, kind, roomId);
    if (!access.ok) {
      return errorResponse('会话不存在', 404);
    }

    const messages = await listMessages(c.env.DB, roomId, before, 50);
    return c.json({ room: access.room, messages });
  });
}
