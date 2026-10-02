import type { Metadata } from 'next';
import { StoreProvider } from '@/components/store';
import { Shell } from '@/components/shell';
import localFont from 'next/font/local';
import type { Product } from '@/lib/types';
import './globals.css';
const heading = localFont({
  src: '../public/fonts/barlow-condensed.ttf',
  weight: '700',
  display: 'swap',
  variable: '--font-heading',
});
const body = localFont({
  src: [
    { path: '../public/fonts/dm-sans-regular.ttf', weight: '400' },
    { path: '../public/fonts/dm-sans-medium.ttf', weight: '500' },
    { path: '../public/fonts/dm-sans-semibold.ttf', weight: '600' },
    { path: '../public/fonts/dm-sans-bold.ttf', weight: '700' },
  ],
  display: 'swap',
  variable: '--font-body',
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'BRMotoGear — Ride Safe. Ride Bold.', template: '%s | BRMotoGear' },
  description:
    'Find your next motorcycle helmet. Explore full-face, open-face and off-road styles with BRMotoGear.',
  icons: { icon: '/icon.svg' },
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  let products: Product[] = [];
  try {
    const r = await fetch(
      `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:5000'}/api/v1/products`,
      { cache: 'no-store', signal: AbortSignal.timeout(3000) },
    );
    if (r.ok) products = await r.json();
  } catch {}
  return (
    <html lang="en-IN" className={`${heading.variable} ${body.variable}`}>
      <body>
        <StoreProvider initialProducts={products}>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
