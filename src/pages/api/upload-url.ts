import type { APIRoute } from 'astro';
import { signPutUrl } from '~/lib/r2';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json().catch(() => null) as { filename?: string; contentType?: string } | null;
  if (!body?.filename || !body?.contentType) return new Response('filename + contentType required', { status: 400 });
  if (!ALLOWED_TYPES.has(body.contentType)) return new Response('unsupported content-type', { status: 400 });
  const ext = body.filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const d = new Date();
  const key = `photos/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`;
  const url = await signPutUrl(locals.runtime.env as any, key, body.contentType);
  return new Response(JSON.stringify({ url, key }), { headers: { 'Content-Type': 'application/json' } });
};
