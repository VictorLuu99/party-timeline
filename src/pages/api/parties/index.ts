import type { APIRoute } from 'astro';
import { db } from '~/lib/db/client';
import { listParties, createParty } from '~/lib/db/queries';
import { invalidateEdgeCache } from '~/lib/cache';
import { validatePartyInput } from '~/lib/validate';

export const GET: APIRoute = async ({ locals }) => {
  const parties = await listParties(db(locals.runtime.env.DB));
  return new Response(JSON.stringify(parties), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const validated = validatePartyInput(await request.json().catch(() => null));
  if (typeof validated === 'string') return new Response(validated, { status: 400 });
  const row = await createParty(db(locals.runtime.env.DB), validated);
  const origin = new URL(request.url).origin;
  await invalidateEdgeCache([`${origin}/api/parties`, `${origin}/`]);
  return new Response(JSON.stringify(row), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
