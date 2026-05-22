import type { APIRoute } from 'astro';
import { db } from '~/lib/db/client';
import { partyPhotos } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { invalidateEdgeCache } from '~/lib/cache';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const partyId = Number(params.id);
  if (!Number.isInteger(partyId) || partyId < 1) return new Response('bad id', { status: 400 });
  const body = await request.json().catch(() => null) as { r2Key?: string; caption?: string; width?: number; height?: number } | null;
  if (!body?.r2Key || typeof body.r2Key !== 'string' || !body.r2Key.startsWith('photos/')) {
    return new Response('r2Key required and must start with photos/', { status: 400 });
  }
  const d = db(locals.runtime.env.DB);
  const existing = await d.select().from(partyPhotos).where(eq(partyPhotos.partyId, partyId));
  const [row] = await d.insert(partyPhotos).values({
    partyId,
    r2Key: body.r2Key,
    caption: body.caption ?? null,
    width: body.width ?? null,
    height: body.height ?? null,
    sortOrder: existing.length,
  }).returning();
  const origin = new URL(request.url).origin;
  await invalidateEdgeCache([`${origin}/api/parties`, `${origin}/`]);
  return new Response(JSON.stringify(row), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
