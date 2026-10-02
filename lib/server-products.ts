import { cache } from 'react';
import type { Product } from './types';
export const getProduct = cache(async (slug: string): Promise<Product | null | undefined> => {
  try {
    const r = await fetch(
      `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:5000'}/api/v1/products/${encodeURIComponent(slug)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(3000) },
    );
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    return await r.json();
  } catch {
    return undefined;
  }
});
