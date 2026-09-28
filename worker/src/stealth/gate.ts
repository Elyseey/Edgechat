import type { StealthSettings } from '../data/stealth-settings.ts';
import { loginWithPassword } from '../login.ts';
import { sessionCookie } from '../session-cookie.ts';

export const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  // no-referrer 会让浏览器表单 POST 的 Origin 变为 null；same-origin 隐藏外站来源且保留同源校验。
  'Referrer-Policy': 'same-origin',
};

export function notFound() {
  return new Response('Not Found', {
    status: 404,
    headers: { ...privateHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export function gatePage(settings: StealthSettings, failed = false, status = 200) {
  const { loginPath, formId, variant } = settings;
  const width = [320, 344, 360][variant];
  const top = ['18vh', '24vh', '12vh'][variant];
  // 网关刻意不引用主站资源：无 JS、Logo、manifest、字体下载或可识别的构建标记。
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in</title><style>
html{color-scheme:light dark;font:16px/1.5 system-ui,sans-serif}body{margin:0;padding:24px}main{max-width:${width}px;margin:${top} auto 0}h1{font-size:24px;margin:0 0 24px}form{display:grid;gap:16px}label{display:grid;gap:6px}input,button{box-sizing:border-box;width:100%;min-height:44px;font:inherit;border:1px solid GrayText;border-radius:${variant * 3}px;padding:8px 12px}button{margin-top:8px;cursor:pointer}input:focus-visible,button:focus-visible{outline:2px solid Highlight;outline-offset:3px}p{font-size:14px}
</style></head><body><main id="${formId}"><h1>Sign in</h1><form action="${loginPath}" method="post"><label>Username<input name="username" autocomplete="username" maxlength="100" required></label><label>Password<input type="password" name="password" autocomplete="current-password" maxlength="1024" required></label><button type="submit">Sign in</button></form>${failed ? '<p role="alert">Unable to sign in. Please try again.</p>' : ''}</main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      ...privateHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

async function readForm(request: Request) {
  // 实际流读取也限额，不能只信 Content-Length；登录表单无需接受大体积或 multipart 上传。
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new URLSearchParams(await new Blob(chunks).text());
}

export async function submitGate(request: Request, env, settings: StealthSettings) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return notFound();
  const form = await readForm(request);
  const username = form?.get('username')?.trim() || '';
  const password = form?.get('password') || '';
  if (!username || username.length > 100 || !password || password.length > 1024) {
    return gatePage(settings, true, 400);
  }
  const session = await loginWithPassword(env, username, password);
  if (!session) return gatePage(settings, true, 401);
  return new Response(null, {
    status: 303,
    headers: { ...privateHeaders, Location: '/', 'Set-Cookie': sessionCookie(request, session.token) },
  });
}
