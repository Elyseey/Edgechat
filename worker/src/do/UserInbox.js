import { validateSession } from '../session.js';
import { isVerifiedInternalRequest, parseVerifiedPrincipal } from '../verified-identity.js';

export class UserInbox {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
    for (const socket of this.state.getWebSockets()) {
      const meta = socket.deserializeAttachment();
      if (meta) this.connections.set(socket, meta);
    }
  }

  async broadcast(packet) {
    for (const [socket, meta] of [...this.connections.entries()]) {
      const auth = meta?.token ? await validateSession(this.env, meta.token) : null;
      if (!auth?.ok || Number(auth.session.userId) !== Number(meta.userId)) {
        this.connections.delete(socket);
        try { socket.close(1008, 'Unauthorized'); } catch {}
        continue;
      }
      try { socket.send(packet); } catch { this.connections.delete(socket); }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/connect') {
      const principal = parseVerifiedPrincipal(request);
      if (!principal?.userId || !principal.token) return new Response('Unauthorized', { status: 401 });
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected websocket', { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      const meta = { userId: principal.userId, token: principal.token };
      server.serializeAttachment(meta);
      this.connections.set(server, meta);
      server.send(JSON.stringify({ type: 'ready' }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname === '/notify' && request.method === 'POST') {
      if (!isVerifiedInternalRequest(request)) return new Response('Unauthorized', { status: 401 });
      const payload = await request.json();
      await this.broadcast(JSON.stringify(payload));
      return Response.json({ ok: true });
    }
    return new Response('Not Found', { status: 404 });
  }

  webSocketClose(ws) { this.connections.delete(ws); }
  webSocketError(ws) { this.connections.delete(ws); }
}
