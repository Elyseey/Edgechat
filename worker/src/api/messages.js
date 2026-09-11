import {
  deleteMessageById,
  getMessageDeletionTarget,
  listMessages
} from '../data/messages.js';
import { markRoomRead } from '../data/unread.js';
import { authorizeRoom, isRoomKind } from '../room-access.js';
import { notifyRoomMessageDeleted } from '../do-bridge.js';
import { errorResponse, parseJsonRequest, sanitizeLimit } from '../utils.js';

export function registerMessageRoutes(app) {
  app.delete('/api/messages/:messageId', async (c) => {
    const session = c.get('session');
    const messageId = Number(c.req.param('messageId'));
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return errorResponse('消息不存在', 404);
    }

    const target = await getMessageDeletionTarget(c.env.DB, messageId);
    if (!target) {
      return errorResponse('消息不存在', 404);
    }

    const access = await authorizeRoom(
      c.env.DB,
      session,
      target.channel_kind,
      target.channel_id,
    );
    if (!access.ok) {
      return errorResponse('无权删除该消息', 403);
    }
    if (!session.isAdmin && Number(target.sender_id) !== Number(session.userId)) {
      return errorResponse('只能删除自己发送的消息', 403);
    }

    const deleted = await deleteMessageById(c.env, messageId);
    if (!deleted) {
      return errorResponse('消息不存在', 404);
    }

    try {
      await notifyRoomMessageDeleted(c.env, target.channel_kind, target.channel_id, messageId);
    } catch (error) {
      console.warn('Failed to broadcast message deletion', error);
    }

    return c.json({ ok: true, messageId });
  });

  app.get('/api/messages', async (c) => {
    const session = c.get('session');
    const kind = c.req.query('kind');
    const roomId = Number(c.req.query('roomId'));
    const before = c.req.query('before');
    const limit = sanitizeLimit(c.req.query('limit'));

    if (!isRoomKind(kind) || !Number.isInteger(roomId) || roomId <= 0) {
      return errorResponse('参数无效');
    }

    const access = await authorizeRoom(c.env.DB, session, kind, roomId);

    if (!access.ok) {
      return errorResponse('无权访问该会话', 403);
    }

    const messages = await listMessages(c.env, roomId, before, limit);
    await markRoomRead(c.env.DB, {
      channelId: roomId,
      userId: session.userId
    });

    return c.json({
      room: {
        id: Number(access.room.id),
        kind: access.room.kind,
        name: access.room.name,
        description: access.room.description
      },
      messages
    });
  });

  app.post('/api/messages/read', async (c) => {
    const session = c.get('session');
    const payload = await parseJsonRequest(c.req.raw);
    const kind = String(payload.kind || '');
    const roomId = Number(payload.roomId);
    const messageId = payload.messageId === undefined ? null : Number(payload.messageId);

    if (
      !isRoomKind(kind) ||
      !Number.isInteger(roomId) ||
      roomId <= 0 ||
      (messageId !== null && (!Number.isInteger(messageId) || messageId <= 0))
    ) {
      return errorResponse('参数无效');
    }

    const access = await authorizeRoom(c.env.DB, session, kind, roomId);

    if (!access.ok) {
      return errorResponse('无权访问该会话', 403);
    }

    const lastReadMessageId = await markRoomRead(c.env.DB, {
      channelId: roomId,
      userId: session.userId,
      messageId
    });

    return c.json({ ok: true, lastReadMessageId });
  });
}
