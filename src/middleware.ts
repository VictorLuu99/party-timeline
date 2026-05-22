import type { MiddlewareHandler } from 'astro';
import { verifyJwt, readAuthCookie } from '~/lib/auth';

const PROTECTED_PATHS = [/^\/admin(\/|$)/, /^\/api\/parties$/, /^\/api\/parties\//, /^\/api\/upload-url$/, /^\/api\/logout$/];

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  const url = new URL(ctx.request.url);
  const isProtected = PROTECTED_PATHS.some(re => re.test(url.pathname));

  // GET /api/parties is public; only writes are protected
  const isPartiesRead = url.pathname === '/api/parties' && ctx.request.method === 'GET';
  if (!isProtected || isPartiesRead || url.pathname === '/admin/login') return next();

  const token = readAuthCookie(ctx.request.headers.get('cookie'));
  const env = ctx.locals.runtime.env;
  const payload = token ? await verifyJwt(token, env.JWT_SECRET) : null;

  if (!payload?.admin) {
    if (url.pathname.startsWith('/api/')) return new Response('Unauthorized', { status: 401 });
    return ctx.redirect('/admin/login');
  }
  ctx.locals.user = { admin: true };
  return next();
};
