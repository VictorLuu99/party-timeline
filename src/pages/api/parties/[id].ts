import type { APIRoute } from 'astro';
import { db } from '~/lib/db/client';
import { updateParty, deleteParty } from '~/lib/db/queries';
import { invalidateEdgeCache } from '~/lib/cache';
import { validatePartyInput } from '~/lib/validate';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return new Response('bad id', { status: 400 });
  const validated = validatePartyInput(await request.json().catch(() => null), { partial: true });
  if (typeof validated === 'string') return new Response(validated, { status: 400 });
  const row = await updateParty(db(locals.runtime.env.DB), id, validated);
  if (!row) return new Response('not found', { status: 404 });
  const origin = new URL(request.url).origin;
  await invalidateEdgeCache([`${origin}/api/parties`, `${origin}/`]);
  return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return new Response('bad id', { status: 400 });
  await deleteParty(db(locals.runtime.env.DB), id);
  const origin = new URL(request.url).origin;
  await invalidateEdgeCache([`${origin}/api/parties`, `${origin}/`]);
  return new Response(null, { status: 204 });
};
