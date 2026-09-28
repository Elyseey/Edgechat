import { errorResponse, errorCodeForStatus, v1ErrorResponse } from './utils.js';
import { validateSession } from './session.js';
import { cookieRequestAllowed, extractSessionToken } from './session-cookie.ts';

export async function authMiddleware(c, next) {
  if (!cookieRequestAllowed(c.req.raw)) return errorResponse('请求被拒绝', 403);
  const token = extractSessionToken(c.req.raw);
  const result = await validateSession(c.env, token);
  if (!result.ok) {
    if (new URL(c.req.url).pathname.startsWith('/api/v1/')) {
      return v1ErrorResponse(errorCodeForStatus(result.status), result.message, result.status);
    }
    return errorResponse(result.message, result.status);
  }

  c.set('session', result.session);
  await next();
}

export async function adminMiddleware(c, next) {
  const session = c.get('session');
  if (!session?.isAdmin) {
    if (new URL(c.req.url).pathname.startsWith('/api/v1/')) {
      return v1ErrorResponse('forbidden', '需要管理员权限', 403);
    }
    return errorResponse('需要管理员权限', 403);
  }

  await next();
}
