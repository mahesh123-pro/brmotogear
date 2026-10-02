'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Search,
  Heart,
  UserRound,
  ShoppingBag,
  Menu,
  X,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from './store';
export function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark">
        BR<span>↗</span>
      </span>
      <span>
        MOTO<span className="logo-light">GEAR</span>
        <small>RIDE SAFE. RIDE BOLD.</small>
      </span>
    </span>
  );
}
export function Header() {
  const { cart, wishlist, config } = useStore();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  return (
    <>
      <div className="announcement">
        <span>YOUR NEXT RIDE STARTS HERE.</span>
        <span>
          Free shipping on orders above ₹2,000 <ArrowUpRight size={12} />
        </span>
        <Link href="/contact">
          Rider support <ArrowUpRight size={12} />
        </Link>
      </div>
      <header className="header">
        <Link aria-label="BRMotoGear home" href="/" className="brand">
          <Logo />
        </Link>
        <nav aria-label="Main navigation" className={menu ? 'nav open' : 'nav'}>
          {[
            ['Shop helmets', '/shop'],
            ['Collections', '/collections'],
            ['Size guide', '/size-guide'],
            ['Journal', '/blog'],
            ['Our story', '/about'],
          ].map(([label, href]) => (
            <Link
              className={path === href ? 'active' : ''}
              key={href}
              href={href}
              onClick={() => setMenu(false)}
            >
              {label}
              {href === '/shop' && <span className="tiny-dot" />}
            </Link>
          ))}
          <Link className="mobile-nav-link" href="/account" onClick={() => setMenu(false)}>
            My account
          </Link>
          <Link className="mobile-nav-link" href="/wishlist" onClick={() => setMenu(false)}>
            Your wishlist
          </Link>
        </nav>
        <div className="nav-actions">
          <button
            aria-label="Search helmets"
            className="icon-button"
            onClick={() => setSearch(!search)}
          >
            {search ? <X /> : <Search />}
          </button>
          <Link
            aria-label={`Wishlist, ${wishlist.length} saved helmets`}
            className="icon-button desktop-icon"
            href="/wishlist"
          >
            <Heart />
            {wishlist.length > 0 && <span className="count">{wishlist.length}</span>}
          </Link>
          <Link aria-label="My account" className="icon-button desktop-icon" href="/account">
            <UserRound />
          </Link>
          <Link
            aria-label={`Shopping bag, ${cart.reduce((n, i) => n + i.quantity, 0)} items`}
            className="icon-button"
            href="/cart"
          >
            <ShoppingBag />
            {cart.length > 0 && (
              <span className="count">{cart.reduce((n, i) => n + i.quantity, 0)}</span>
            )}
          </Link>
          <button
            aria-label={menu ? 'Close menu' : 'Open menu'}
            aria-expanded={menu}
            className="icon-button mobile-toggle"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {search && (
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get('q');
            router.push(`/shop?q=${encodeURIComponent(String(q))}`);
            setSearch(false);
          }}
        >
          <Search size={20} />
          <input
            name="q"
            aria-label="Search products"
            placeholder="Try ‘black helmet’ or ‘under 5000’"
            autoFocus
          />
          <button className="button small" type="submit">
            Search <ArrowRight size={16} />
          </button>
        </form>
      )}
      {config?.demo && path !== '/' && (
        <div className="demo-bar">
          DEMO STORE · Sample prices and inventory. Payments are simulated; no money is charged.
        </div>
      )}
    </>
  );
}
export function Footer() {
  const { config } = useStore();
  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/">
            <Logo />
          </Link>
          <p>
            For the early starts.
            <br />
            The long way home.
            <br />
            And everything in between.
          </p>
          <span className="eyebrow">MADE FOR THE RIDER IN YOU.</span>
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/shop">All helmets</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/wishlist">Your wishlist</Link>
          <Link href="/about">Our story</Link>
          <Link href="/blog">Rider journal</Link>
          <Link href="/lookbook">The lookbook</Link>
        </div>
        <div>
          <h4>Rider support</h4>
          <Link href="/size-guide">Find your fit</Link>
          <Link href="/safety-guide">Helmet care & safety</Link>
          <Link href="/account/orders">Track your order</Link>
          <Link href="/contact">Contact us</Link>
          <Link href="/faq">FAQs</Link>
          <Link href="/ride-checklist">Weekend checklist</Link>
        </div>
        <div>
          <h4>The small print</h4>
          <Link href="/shipping-returns">Shipping & returns</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms of service</Link>
          <Link href="/admin">Admin workspace</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} BRMotoGear. Ride safe. Ride bold.</span>
        <span>
          <ShieldCheck size={15} />{' '}
          {config?.demo ? 'Demo checkout · No real payments' : 'Payments powered by Razorpay'}
        </span>
        <span>INDIA / INR ₹</span>
      </div>
      {config?.demo && (
        <p className="demo-foot">
          Demonstration catalog. Product photography: AXOR. Lifestyle photography: Unsplash. Brand
          names identify the pictured products; retailer authorization, specifications and sale
          terms must be confirmed before launch.
        </p>
      )}
    </footer>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const { error, reload } = useStore();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      {error && (
        <div className="error-banner" role="alert">
          {error} <button onClick={() => void reload()}>Retry connection</button>
        </div>
      )}
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
