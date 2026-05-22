export async function invalidateEdgeCache(urls: string[]): Promise<void> {
  const cache = (caches as any).default;
  if (!cache) return;
  await Promise.all(urls.map(u => cache.delete(u)));
}
