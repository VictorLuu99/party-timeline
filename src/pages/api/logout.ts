import type { APIRoute } from 'astro';
import { clearAuthCookie } from '~/lib/auth';
export const POST: APIRoute = async () =>
  new Response(null, { status: 204, headers: { 'Set-Cookie': clearAuthCookie() } });
