import { MessageSubmissionError, submitRoomMessage } from '../message-submission.js';
import { authorizeRoom } from '../room-access.js';
import { validateSession } from '../session.js';
import { projectUnreadMessage } from '../unread-projection.js';
import { parseVerifiedPrincipal } from '../verified-identity.js';

const MESSAGE_SIZE_LIMIT = 10 * 1024;

function socketMeta(token, principal, room) {
  return {
    token,
    principal,
    room
  };
}

function sendSocketError(ws, message) {
  try {
    ws.send(JSON.stringify({ type: 'error', error: message }));
  } catch {
    // Ignore broken sockets.
  }
}

function getMessageByteLength(message) {
  if (typeof message === 'string') {
    return new TextEncoder().encode(message).length;
  }
  if (message instanceof ArrayBuffer) {
    return message.byteLength;
  }
  if (ArrayBuffer.isView(message)) {
    return message.byteLength;
  }

  // 未知 WebSocket 消息类型无法可靠解析，按超大处理，避免绕过大小限制。
  return Number.MAX_SAFE_INTEGER;
}

function normalizeWebSocketMessage(message) {
  if (typeof message === 'string') {
    return message;
  }
  if (message instanceof ArrayBuffer) {
    return new TextDecoder().decode(message);
  }
  if (ArrayBuffer.isView(message)) {
    return new TextDecoder().decode(message);
  }
  return '';
}

export class ChannelRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();

    for (const socket of this.state.getWebSockets()) {
      const meta = socket.deserializeAttachment();
      if (meta) {
        this.connections.set(socket, meta);
      }
    }
  }

  parsePayload(ws, message) {
    try {
      return JSON.parse(message);
    } catch {
      sendSocketError(ws, 'Invalid message payload');
      return null;
    }
  }

  async revalidateConnection(ws, meta) {
    if (!meta?.token) {
      return null;
    }

    const auth = await validateSession(this.env, meta.token);
    if (!auth.ok) {
      this.closeUnauthorizedSocket(ws);
      return null;
    }

    const access = await authorizeRoom(
      this.env.DB,
      auth.session,
      meta.room.kind,
      meta.room.id
    );
    if (!access.ok) {
      this.closeUnauthorizedSocket(ws);
      return null;
    }

    const { room } = access;

    const nextMeta = socketMeta(
      meta.token,
      {
        userId: auth.session.userId,
        isAdmin: auth.session.isAdmin
      },
      room
    );
    this.connections.set(ws, nextMeta);
    ws.serializeAttachment(nextMeta);
    return nextMeta;
  }

  closeUnauthorizedSocket(ws) {
    this.connections.delete(ws);
    try {
      ws.close(1008, 'Unauthorized');
    } catch {
      // Ignore broken sockets.
    }
  }

  async broadcast(packet) {
    const connections = [...this.connections.entries()];
    const validated = await Promise.all(
      connections.map(async ([socket, meta]) => ({
        socket,
        meta: await this.revalidateConnection(socket, meta)
      }))
    );

    for (const { socket, meta } of validated) {
      if (!meta) continue;
      try {
        socket.send(packet);
      } catch {
        this.connections.delete(socket);
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const token = url.searchParams.get('token') || '';
    const kind = url.searchParams.get('kind') || '';
    const roomId = Number(url.searchParams.get('id') || '');

    let principal = parseVerifiedPrincipal(request);
    if (!principal) {
      const auth = await validateSession(this.env, token);
      if (!auth.ok) {
        return new Response('Unauthorized', { status: 401 });
      }

      principal = {
        userId: auth.session.userId,
        isAdmin: auth.session.isAdmin
      };
    }

    const access = await authorizeRoom(this.env.DB, principal, kind, roomId);

    if (!access.ok) {
      return new Response('Forbidden', { status: 403 });
    }
    const { room } = access;

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    const meta = socketMeta(token, principal, room);
    server.serializeAttachment(meta);
    this.connections.set(server, meta);
    server.send(
      JSON.stringify({
        type: 'ready',
        room: {
          id: Number(room.id),
          kind: room.kind,
          name: room.name
        }
      })
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const meta = this.connections.get(ws);
    if (!meta) {
      return;
    }

    if (getMessageByteLength(message) > MESSAGE_SIZE_LIMIT) {
      sendSocketError(ws, `消息过大，最大 ${Math.round(MESSAGE_SIZE_LIMIT / 1024)}KB`);
      return;
    }

    const payload = this.parsePayload(ws, normalizeWebSocketMessage(message));
    if (!payload) {
      return;
    }

    if (payload.type !== 'send') {
      sendSocketError(ws, 'Unsupported message type');
      return;
    }

    try {
      const currentMeta = await this.revalidateConnection(ws, meta);
      if (!currentMeta) {
        return;
      }

      const { message: saved, packet } = await submitRoomMessage(
        this.env.DB,
        currentMeta,
        payload
      );
      await this.broadcast(packet);

      // 未读投影不影响消息提交结果，交给 DO 生命周期继续完成，缩短发送链路。
      this.state.waitUntil(
        projectUnreadMessage(this.env, {
          room: currentMeta.room,
          senderId: currentMeta.principal.userId,
          message: saved
        })
      );
    } catch (error) {
      if (error instanceof MessageSubmissionError) {
        sendSocketError(ws, error.message);
        return;
      }
      console.error(JSON.stringify({
        message: 'room message submission failed',
        roomId: Number(meta.room?.id || 0),
        error: error instanceof Error ? error.message : String(error)
      }));
      sendSocketError(ws, '消息发送失败');
    }
  }

  webSocketClose(ws) {
    this.connections.delete(ws);
  }

  webSocketError(ws) {
    this.connections.delete(ws);
  }
}
