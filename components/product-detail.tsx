'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Heart,
  Minus,
  Plus,
  Ruler,
  Truck,
  ShieldCheck,
  Expand,
  X,
  ChevronRight,
  Star,
} from 'lucide-react';
import { useStore } from './store';
import { api, send } from '@/lib/api';
import { money, type Product, type Review } from '@/lib/types';
import { ProductCard } from './products';
export function ProductDetail({ slug }: { slug: string }) {
  const { products, add, wishlist, toggleWish, toast, user, ready } = useStore();
  const [remote, setRemote] = useState<(Product & { reviews: Review[] }) | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('Details');
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef(0);
  const router = useRouter();
  useEffect(() => {
    setView(0);
    setSize('');
    setColor('');
    setRemote(null);
    setError('');
    api<Product & { reviews: Review[] }>(`/products/${slug}`)
      .then(setRemote)
      .catch((e) => setError(e.message));
  }, [slug]);
  const p = remote || products.find((p) => p.slug === slug);
  if (!p)
    return (
      <div className="page-wrap empty-state">
        <h1>{error || 'Getting your helmet ready…'}</h1>
        <Link href="/shop" className="button">
          Back to shop
        </Link>
      </div>
    );
  const selectedColor = color || p.variants[0]?.color;
  const variant = p.variants.find((v) => v.size === size && v.color === selectedColor);
  const available = variant ? variant.stock - variant.reserved : 0;
  const reviews = remote?.reviews || [];
  const purchase = (buy = false) => {
    if (!size) {
      toast('Choose your helmet size first.');
      return;
    }
    if (available < quantity) {
      toast('This size is currently unavailable.');
      return;
    }
    const added = add({ productId: p.id, size, color: selectedColor, quantity });
    if (buy && added) router.push('/checkout');
  };
  return (
    <div className="page-wrap">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shop">Helmets</Link>
        <span>/</span>
        {p.name}
      </div>
      <div className="product-detail">
        <div>
          <div
            className="gallery-main"
            onTouchStart={(e) => {
              touchStart.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const distance = touchStart.current - e.changedTouches[0].clientX;
              if (Math.abs(distance) > 45)
                setView((view + (distance > 0 ? 1 : -1) + p.images.length) % p.images.length);
            }}
          >
            <Image
              key={`${p.id}-${view}`}
              className="gallery-image-enter"
              src={`${p.images[view] || p.images[0]}${(p.images[view] || p.images[0]).startsWith('/images/') ? '?v=2' : ''}`}
              alt={`${p.name}, view ${view + 1}`}
              fill
              priority
              sizes="(max-width:800px) 100vw, 55vw"
            />
            <button
              className="gallery-expand icon-button"
              aria-label="Enlarge helmet image"
              onClick={() => dialog.current?.showModal()}
            >
              <Expand size={20} />
            </button>
            <span className="gallery-count">
              {String(view + 1).padStart(2, '0')} / {String(p.images.length).padStart(2, '0')}
            </span>
          </div>
          <div className="thumbnails">
            {p.images.map((image, i) => (
              <button
                aria-label={`Show image ${i + 1}`}
                className={view === i ? 'selected' : ''}
                key={image}
                onClick={() => setView(i)}
              >
                <Image
                  src={`${image}${image.startsWith('/images/') ? '?v=2' : ''}`}
                  alt={`${p.name} thumbnail ${i + 1}`}
                  width={90}
                  height={90}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="purchase-panel">
          <span className="eyebrow orange-text">
            {p.brand} / {p.category}
          </span>
          <h1>{p.name}</h1>
          <p className="product-intro">{p.description}</p>
          <button
            className="review-link"
            onClick={() => {
              setTab('Reviews');
              document
                .getElementById('product-information')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Star size={15} />
            {reviews.length
              ? `${(reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1)} · ${reviews.length} verified reviews`
              : 'Be the first to review'}
          </button>
          <div className="detail-price">
            <strong>{money(p.price)}</strong>
            {p.mrp > p.price && <del>{money(p.mrp)}</del>}
            {p.mrp > p.price && (
              <span className="discount-badge">
                SAVE {Math.round((1 - p.price / p.mrp) * 100)}%
              </span>
            )}
          </div>
          <small className="muted">Inclusive of all taxes</small>
          <div className="purchase-divider" />
          <label className="field-caption">
            COLOUR <span>{selectedColor}</span>
          </label>
          <div className="variant-colors">
            {[...new Set(p.variants.map((v) => v.color))].map((c) => (
              <button
                key={c}
                className={selectedColor === c ? 'selected' : ''}
                onClick={() => {
                  setColor(c);
                  setSize('');
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="field-row" id="helmet-sizes">
            <label className="field-caption">SELECT SIZE</label>
            <Link className="underlined" href="/size-guide">
              <Ruler size={15} /> Size guide
            </Link>
          </div>
          <div className="size-buttons detail-sizes">
            {p.variants
              .filter((v) => v.color === selectedColor)
              .map((v) => (
                <button
                  key={v.size}
                  disabled={v.stock - v.reserved === 0}
                  className={size === v.size ? 'selected' : ''}
                  onClick={() => setSize(v.size)}
                >
                  {v.size}
                </button>
              ))}
          </div>
          <p className="stock-status">
            {size
              ? available > 0
                ? `${available} available in ${size}`
                : 'This size is currently unavailable'
              : 'Choose a size to check availability'}
          </p>
          <div className="purchase-actions">
            <div className="quantity">
              <button
                aria-label="Decrease quantity"
                disabled={quantity === 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus size={15} />
              </button>
              <span>{quantity}</span>
              <button
                aria-label="Increase quantity"
                disabled={quantity >= 10 || (!!size && quantity >= available)}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={15} />
              </button>
            </div>
            <button className="button" onClick={() => purchase()}>
              Add to bag <ArrowRight size={19} />
            </button>
            <button
              className="button outline square"
              aria-label="Save to wishlist"
              onClick={() => toggleWish(p.id)}
            >
              <Heart fill={wishlist.includes(p.id) ? 'currentColor' : 'none'} size={20} />
            </button>
          </div>
          <button className="button outline full" onClick={() => purchase(true)}>
            Buy it now <ArrowUpIcon />
          </button>
          <div className="product-promises">
            <span>
              <Truck size={19} /> Free delivery above ₹2,000
            </span>
            <span>
              <ShieldCheck size={19} /> Check fit and specifications before riding
            </span>
          </div>
          <p className="small-note">
            {p.certification}. <Link href="/safety-guide">Read our safety guide.</Link>
          </p>
        </div>
      </div>
      <section className="product-information" id="product-information">
        <div className="tabs" role="tablist" aria-label="Product information">
          {['Details', 'Specifications', 'Reviews'].map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'active' : ''}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
              {t === 'Reviews' ? ` (${reviews.length})` : ''}
            </button>
          ))}
        </div>
        <div className="tab-content" role="tabpanel">
          {tab === 'Details' ? (
            <div className="details-grid">
              <div>
                <h2>Made for your next chapter.</h2>
                <p>{p.description}</p>
                <p>
                  Getting the right fit matters. Compare your head measurement with the current
                  manufacturer’s chart and keep all labels and packaging until you’ve checked the
                  fit.
                </p>
              </div>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <ChevronRight size={17} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ) : tab === 'Specifications' ? (
            <dl className="spec-list">
              {Object.entries({
                ...p.specifications,
                'Helmet type': p.category,
                Certification: p.certification,
              }).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="reviews-layout">
              <div>
                {reviews.length ? (
                  reviews.map((r) => (
                    <article className="review" key={r.id}>
                      <span className="stars">
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)}
                      </span>
                      <p>{r.text}</p>
                      <strong>{r.name}</strong>
                      <small> · Verified purchase</small>
                      {r.image && (
                        <a href={r.image} target="_blank" rel="noreferrer">
                          {' '}
                          View customer photo
                        </a>
                      )}
                    </article>
                  ))
                ) : (
                  <p>
                    No reviews yet. Reviews from delivered orders will appear here after moderation.
                  </p>
                )}
              </div>
              {user ? (
                <form
                  className="panel"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    try {
                      await api(
                        `/products/${p.id}/reviews`,
                        send('POST', {
                          rating: Number(f.get('rating')),
                          text: f.get('text'),
                          image: f.get('image') || '',
                        }),
                      );
                      toast('Thank you. Your review has been submitted for moderation.');
                      form.reset();
                    } catch (e) {
                      toast((e as Error).message);
                    }
                  }}
                >
                  <h3>Share your experience</h3>
                  <label>
                    Rating
                    <select name="rating">
                      <option value="5">5 — Excellent</option>
                      <option value="4">4 — Good</option>
                      <option value="3">3 — Okay</option>
                      <option value="2">2 — Below expectations</option>
                      <option value="1">1 — Poor</option>
                    </select>
                  </label>
                  <label>
                    Your review
                    <textarea name="text" minLength={10} maxLength={1500} required />
                  </label>
                  <label>
                    Photo URL (optional)
                    <input name="image" type="url" placeholder="https://…" />
                  </label>
                  <button className="button">Submit review</button>
                </form>
              ) : (
                <Link href="/account" className="text-link">
                  Sign in to write a review <ArrowRight size={16} />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
      <section className="section related">
        <div className="section-heading">
          <h2>Keep exploring.</h2>
          <Link href="/shop" className="text-link">
            All helmets <ArrowRight size={18} />
          </Link>
        </div>
        <div className="product-grid">
          {products
            .filter((x) => x.id !== p.id)
            .slice(0, 4)
            .map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
        </div>
      </section>
      <div className="mobile-purchase">
        <strong>{money(p.price)}</strong>
        <button
          className="button"
          onClick={() => {
            if (!size) {
              document.getElementById('helmet-sizes')?.scrollIntoView({ behavior: 'smooth' });
              return;
            }
            purchase(true);
          }}
        >
          {size ? 'Buy now' : 'Choose your size'}
          <ArrowRight size={17} />
        </button>
      </div>
      <dialog className="image-dialog" ref={dialog}>
        <button
          className="icon-button close-dialog"
          aria-label="Close enlarged image"
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
        <Image
          src={`${p.images[view] || p.images[0]}${(p.images[view] || p.images[0]).startsWith('/images/') ? '?v=2' : ''}`}
          alt={`${p.name} enlarged`}
          width={1000}
          height={1000}
        />
      </dialog>
    </div>
  );
}
function ArrowUpIcon() {
  return <ArrowRight size={18} />;
}
