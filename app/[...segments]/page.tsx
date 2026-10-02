import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { RouteView } from '@/components/routes';
import { getProduct } from '@/lib/server-products';
import { journalArticles } from '@/lib/journal';
const pages = [
  'shop',
  'helmets',
  'wishlist',
  'product',
  'cart',
  'checkout',
  'order',
  'account',
  'admin',
  'collections',
  'about',
  'size-guide',
  'safety-guide',
  'faq',
  'contact',
  'shipping-returns',
  'privacy',
  'terms',
  'blog',
  'lookbook',
  'ride-checklist',
];
type Props = { params: Promise<{ segments: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments } = await params;
  const [page, slug] = segments;
  let title = page
    .split('-')
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(' ');
  let description = `Explore ${title.toLowerCase()} at BRMotoGear. Ride safe. Ride bold.`;
  if (page === 'blog') {
    const article = journalArticles.find((a) => a.slug === slug);
    title = article?.title || 'Rider Journal';
    description =
      article?.summary ||
      'Stories, weekend packing notes and everyday riding rituals from BRMotoGear.';
  }
  if (page === 'lookbook') {
    title = 'The Road, in Frames — Lookbook';
    description =
      'Explore the BRMotoGear visual riding moodboard: everyday details, forest roads and moments between the miles.';
  }
  if (page === 'ride-checklist') {
    title = 'Weekend Packing Checklist';
    description =
      'Plan your overnight essentials with a printable packing checklist that saves your progress on this device.';
  }
  if (page === 'product' && slug) {
    const p = await getProduct(slug);
    if (p) {
      title = `${p.brand} ${p.name}`;
      description = p.description;
    }
  }
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    alternates: { canonical: `/${segments.join('/')}` },
    robots: ['admin', 'account', 'checkout', 'cart', 'order', 'wishlist'].includes(page)
      ? { index: false, follow: false }
      : undefined,
  };
}
export default async function Page({ params }: Props) {
  const { segments } = await params;
  const [page, slug] = segments;
  if (
    !pages.includes(page) ||
    segments.length > 2 ||
    (['product', 'order'].includes(page) && !slug) ||
    (!['product', 'order', 'account', 'helmets', 'blog'].includes(page) && segments.length > 1) ||
    (page === 'blog' && slug && !journalArticles.some((a) => a.slug === slug)) ||
    (page === 'account' && slug && !['orders', 'addresses'].includes(slug))
  )
    notFound();
  const product = page === 'product' ? await getProduct(slug) : undefined;
  if (product === null) notFound();
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${product.brand} ${product.name}`,
        description: product.description,
        image: product.images.map((src) => new URL(src, base).href),
        brand: { '@type': 'Brand', name: product.brand },
        sku: product.id,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: product.price / 100,
          url: `${base}/product/${product.slug}`,
          availability: product.variants.some((v) => v.stock > v.reserved)
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      }
    : null;
  return (
    <Suspense fallback={<div className="page-wrap loading">Preparing your ride…</div>}>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <RouteView segments={segments} />
    </Suspense>
  );
}
