import type { MetadataRoute } from 'next';
import { journalArticles } from '@/lib/journal';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pages = [
    '',
    '/shop',
    '/collections',
    '/about',
    '/size-guide',
    '/safety-guide',
    '/contact',
    '/faq',
    '/blog',
    '/lookbook',
    '/ride-checklist',
    ...journalArticles.map((article) => `/blog/${article.slug}`),
  ];
  try {
    const r = await fetch(
      `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:5000'}/api/v1/products`,
      { next: { revalidate: 3600 } },
    );
    if (r.ok) {
      const products = await r.json();
      pages.push(...products.map((p: { slug: string }) => `/product/${p.slug}`));
    }
  } catch {}
  return pages.map((page) => ({
    url: base + page,
    changeFrequency: 'weekly',
    priority: page ? 0.7 : 1,
  }));
}
