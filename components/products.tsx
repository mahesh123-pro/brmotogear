'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ArrowUpRight, ArrowRight, SlidersHorizontal, X } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from './store';
import { categories, money, type Product } from '@/lib/types';
export function ProductCard({ product: p, index = 0 }: { product: Product; index?: number }) {
  const { wishlist, toggleWish } = useStore();
  const quick = useRef<HTMLDialogElement>(null);
  return (
    <article className="product-card">
      <div className="product-picture">
        <Link href={`/product/${p.slug}`} aria-label={`View ${p.name}`}>
          <Image
            src={p.images[0]}
            alt={`${p.brand} ${p.name} helmet`}
            fill
            sizes="(max-width: 600px) 48vw, (max-width: 1000px) 33vw, 25vw"
            className="product-image"
          />
          {p.images[1] && (
            <Image
              src={`${p.images[1]}${p.images[1].startsWith('/images/') ? '?v=2' : ''}`}
              alt={`${p.name} alternate view`}
              fill
              sizes="25vw"
              className="product-image alternate"
            />
          )}
        </Link>
        <span className={`product-label ${index === 1 ? 'orange' : ''}`}>
          {index === 0 ? 'RIDER’S PICK' : index === 1 ? 'STAND OUT' : p.category.toUpperCase()}
        </span>
        <button
          className={`wish-button ${wishlist.includes(p.id) ? 'saved' : ''}`}
          aria-label={`${wishlist.includes(p.id) ? 'Remove' : 'Save'} ${p.name} ${wishlist.includes(p.id) ? 'from' : 'to'} wishlist`}
          onClick={() => toggleWish(p.id)}
        >
          <Heart size={17} fill={wishlist.includes(p.id) ? 'currentColor' : 'none'} />
        </button>
        <button
          className="quick-peek"
          onClick={() => quick.current?.showModal()}
          aria-label={`Quick view ${p.name}`}
        >
          Quick view
        </button>
        <Link className="card-shop" href={`/product/${p.slug}`}>
          Choose your size <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="product-meta">
        <span>
          {p.brand} / {p.category}
        </span>
        <span
          className="color-dot"
          style={{
            background:
              p.variants[0]?.color === 'Green'
                ? '#718475'
                : p.variants[0]?.color === 'Graphic'
                  ? '#c64726'
                  : '#242424',
          }}
        />
      </div>
      <Link className="product-name" href={`/product/${p.slug}`}>
        {p.name}
      </Link>
      <div className="price-row">
        <strong>{money(p.price)}</strong>
        {p.mrp > p.price && <del>{money(p.mrp)}</del>}
        {p.mrp > p.price && <span>{Math.round((1 - p.price / p.mrp) * 100)}% OFF</span>}
      </div>
      {!!p.reviewCount && (
        <p className="rating-note">
          ★ {p.rating?.toFixed(1)} · {p.reviewCount} verified reviews
        </p>
      )}
      <dialog ref={quick} className="quick-dialog">
        <button
          className="icon-button close-dialog"
          aria-label="Close quick view"
          onClick={() => quick.current?.close()}
        >
          <X size={20} />
        </button>
        <div className="quick-layout">
          <Image src={p.images[0]} alt={p.name} width={350} height={350} />
          <div>
            <span className="eyebrow orange-text">
              {p.brand} / {p.category}
            </span>
            <h2>{p.name}</h2>
            <strong>{money(p.price)}</strong>
            <p>{p.description}</p>
            <Link
              className="button"
              href={`/product/${p.slug}`}
              onClick={() => quick.current?.close()}
            >
              Choose your size <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </dialog>
    </article>
  );
}
export function Catalog({
  wishlistOnly = false,
  category: initialCategory = '',
}: {
  wishlistOnly?: boolean;
  category?: string;
}) {
  const { products, wishlist, ready, config } = useStore();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [category, setCategory] = useState(initialCategory || params.get('category') || '');
  const [price, setPrice] = useState(20000);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [sort, setSort] = useState('recommended');
  const [brand, setBrand] = useState('');
  const [rating, setRating] = useState(0);
  const [certification, setCertification] = useState('');
  const [inStock, setInStock] = useState(false);
  const [filters, setFilters] = useState(false);
  useEffect(() => {
    setQ(params.get('q') || '');
    setCategory(initialCategory || params.get('category') || '');
  }, [params, initialCategory]);
  const filtered = useMemo(() => {
    const under = q.match(/under\s+(\d+)/i);
    const words = q
      .toLowerCase()
      .replace(/under\s+\d+/, '')
      .replace(/helmets?/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return products
      .filter(
        (p) =>
          (!wishlistOnly || wishlist.includes(p.id)) &&
          (!category || p.category === category) &&
          p.price <= price * 100 &&
          (!under || p.price <= Number(under[1]) * 100) &&
          (!size || p.variants.some((v) => v.size === size)) &&
          (!color || p.variants.some((v) => v.color === color)) &&
          (!inStock || p.variants.some((v) => v.stock > v.reserved)) &&
          (!brand || p.brand === brand) &&
          (!rating || (p.rating || 0) >= rating) &&
          (!certification || p.certification === certification) &&
          words.every((w) =>
            `${p.name} ${p.brand} ${p.category} ${p.description} ${p.variants.map((v) => v.color)}`
              .toLowerCase()
              .includes(w),
          ),
      )
      .sort((a, b) =>
        sort === 'low'
          ? a.price - b.price
          : sort === 'high'
            ? b.price - a.price
            : sort === 'new'
              ? b.createdAt.localeCompare(a.createdAt)
              : sort === 'rating'
                ? (b.rating || 0) - (a.rating || 0)
                : sort === 'discount'
                  ? 1 - b.price / b.mrp - (1 - a.price / a.mrp)
                  : Number(b.featured) - Number(a.featured),
      );
  }, [
    products,
    wishlistOnly,
    wishlist,
    category,
    price,
    size,
    color,
    inStock,
    q,
    sort,
    brand,
    rating,
    certification,
  ]);
  const clear = () => {
    setCategory('');
    setPrice(20000);
    setSize('');
    setColor('');
    setQ('');
    setInStock(false);
    setBrand('');
    setRating(0);
    setCertification('');
  };
  return (
    <div className="page-wrap">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        {wishlistOnly ? 'Wishlist' : 'Shop helmets'}
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow orange-text">
            {wishlistOnly ? 'KEEP YOUR FAVOURITES CLOSE' : 'FIND YOUR NEXT COMPANION'}
          </span>
          <h1>
            {wishlistOnly
              ? 'Your wishlist.'
              : category
                ? `${category} helmets.`
                : 'Every ride. Your helmet.'}
          </h1>
          <p>
            {wishlistOnly
              ? 'The helmets you’re coming back for.'
              : 'From your everyday commute to the road less travelled.'}
          </p>
        </div>
        <span className="section-number">{String(filtered.length).padStart(2, '0')} HELMETS</span>
      </div>
      <div className="catalog-toolbar">
        <input
          aria-label="Search helmets"
          placeholder="Search helmets, styles, colours…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="button outline mobile-filter" onClick={() => setFilters(!filters)}>
          <SlidersHorizontal size={16} /> Filters
        </button>
        <label className="sort-label">
          Sort by{' '}
          <select aria-label="Sort products" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">Recommended</option>
            <option value="new">Newest arrivals</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="discount">Biggest saving</option>
            <option value="rating">Highest rated</option>
          </select>
        </label>
      </div>
      <div className="catalog-layout">
        <aside className={filters ? 'filters visible' : 'filters'}>
          <div className="filter-title">
            <h3>Refine your ride</h3>
            <button onClick={clear}>Reset</button>
          </div>
          <fieldset>
            <legend>Helmet type</legend>
            {['', ...(config?.categories || categories)].map((c) => (
              <label className="check-label" key={c}>
                <input
                  type="radio"
                  name="category"
                  checked={category === c}
                  onChange={() => setCategory(c)}
                />
                {c || 'All helmets'}
                <span>{products.filter((p) => !c || p.category === c).length}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Brand</legend>
            <select
              aria-label="Filter by brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            >
              <option value="">All brands</option>
              {[...new Set(products.map((p) => p.brand))].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>Customer rating</legend>
            <select
              aria-label="Minimum rating"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              <option value={0}>All ratings</option>
              <option value={4}>4 stars & above</option>
              <option value={3}>3 stars & above</option>
            </select>
          </fieldset>
          <fieldset>
            <legend>Certification</legend>
            <select
              aria-label="Certification"
              value={certification}
              onChange={(e) => setCertification(e.target.value)}
            >
              <option value="">All certifications</option>
              {[...new Set(products.map((p) => p.certification))]
                .filter((c) => !/not verified|unverified/i.test(c))
                .map((c) => (
                  <option key={c}>{c}</option>
                ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>Budget</legend>
            <input
              aria-label="Maximum price"
              type="range"
              min={2000}
              max={20000}
              step={500}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
            <div className="range-label">
              <span>₹2,000</span>
              <span>Up to {money(price * 100)}</span>
            </div>
          </fieldset>
          <fieldset>
            <legend>Size</legend>
            <div className="size-buttons">
              {['S', 'M', 'L', 'XL'].map((s) => (
                <button
                  className={size === s ? 'selected' : ''}
                  key={s}
                  onClick={() => setSize(size === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Colour</legend>
            <select aria-label="Colour" value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="">Every colour</option>
              {[...new Set(products.flatMap((p) => p.variants.map((v) => v.color)))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </fieldset>
          <label className="check-label">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            In stock only
          </label>
          <Link href="/size-guide" className="fit-card">
            <span>
              Good rides start
              <br />
              with the right fit.
            </span>
            <small>
              Find your size <ArrowUpRight size={14} />
            </small>
          </Link>
        </aside>
        <div>
          {!ready && !products.length ? (
            <p className="loading">Getting the helmets ready…</p>
          ) : filtered.length ? (
            <div className="product-grid catalog-grid">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Heart size={35} />
              <h2>
                {wishlistOnly ? 'Your next favourite is out there.' : 'No helmets match just yet.'}
              </h2>
              <p>
                {wishlistOnly
                  ? 'Tap the heart on a helmet to save it here.'
                  : 'Try another search or reset your filters.'}
              </p>
              {wishlistOnly ? (
                <Link href="/shop" className="button">
                  Explore helmets <ArrowRight size={16} />
                </Link>
              ) : (
                <button className="button" onClick={clear}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
