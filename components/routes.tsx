'use client';
import { Catalog } from './products';
import { ProductDetail } from './product-detail';
import dynamic from 'next/dynamic';
import { useStore } from './store';
const Bag = dynamic(() => import('./cart-checkout').then((m) => m.Bag));
const Checkout = dynamic(() => import('./cart-checkout').then((m) => m.Checkout));
const OrderPage = dynamic(() => import('./cart-checkout').then((m) => m.OrderPage));
const Account = dynamic(() => import('./account').then((m) => m.Account));
const InfoPage = dynamic(() => import('./information').then((m) => m.InfoPage));
const Admin = dynamic(() => import('./admin').then((m) => m.Admin));
const Journal = dynamic(() => import('./journal').then((m) => m.Journal));
const Lookbook = dynamic(() => import('./journal').then((m) => m.Lookbook));
const RideChecklist = dynamic(() => import('./ride-checklist').then((m) => m.RideChecklist));
export function RouteView({ segments }: { segments: string[] }) {
  const { config } = useStore();
  const [page, slug] = segments;
  if (page === 'shop' || page === 'helmets')
    return (
      <Catalog
        category={
          page === 'helmets' && slug
            ? config?.categories.find((c) => c.toLowerCase().replace(/\s+/g, '-') === slug) || slug
            : ''
        }
      />
    );
  if (page === 'wishlist') return <Catalog wishlistOnly />;
  if (page === 'product') return <ProductDetail slug={slug} />;
  if (page === 'cart') return <Bag />;
  if (page === 'checkout') return <Checkout />;
  if (page === 'order') return <OrderPage id={slug} />;
  if (page === 'account') return <Account section={slug || 'profile'} />;
  if (page === 'admin') return <Admin />;
  if (page === 'blog') return <Journal slug={slug} />;
  if (page === 'lookbook') return <Lookbook />;
  if (page === 'ride-checklist') return <RideChecklist />;
  return <InfoPage page={page} />;
}
