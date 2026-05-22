import type { APIRoute } from 'astro';
import { constantTimeEqual, signJwt, setAuthCookie } from '~/lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const body = await request.json().catch(() => ({ password: '' })) as { password?: unknown };
  const password = body?.password;
  if (typeof password !== 'string' || !constantTimeEqual(password, env.ADMIN_PASSWORD)) {
    return new Response('Invalid', { status: 401 });
  }
  const token = await signJwt({ admin: true }, env.JWT_SECRET, 30 * 24 * 60 * 60);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': setAuthCookie(token) } });
};
