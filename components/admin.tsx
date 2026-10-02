'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tag,
  Star,
  MessageSquare,
  Plus,
  ArrowUpRight,
  Search,
  ArrowLeft,
  Save,
  Box,
  Check,
  X,
} from 'lucide-react';
import { useStore } from './store';
import { api, send } from '@/lib/api';
import { money, categories, type State, type Product, type Order } from '@/lib/types';
const sections = [
  { key: 'overview', name: 'Overview', icon: LayoutDashboard },
  { key: 'products', name: 'Products', icon: Package },
  { key: 'categories', name: 'Categories', icon: Tag },
  { key: 'inventory', name: 'Inventory', icon: Box },
  { key: 'orders', name: 'Orders', icon: ShoppingBag },
  { key: 'customers', name: 'Customers', icon: Users },
  { key: 'coupons', name: 'Coupons', icon: Tag },
  { key: 'reviews', name: 'Reviews', icon: Star },
  { key: 'messages', name: 'Support inbox', icon: MessageSquare },
];
const blankProduct: Product = {
  id: '',
  slug: '',
  name: '',
  brand: '',
  category: 'Full Face',
  price: 0,
  mrp: 0,
  images: ['/images/apex-solid-0.jpg'],
  description: '',
  variants: ['S', 'M', 'L', 'XL'].map((size) => ({ size, color: 'Black', stock: 0, reserved: 0 })),
  specifications: {},
  features: [],
  certification: 'Not verified',
  active: false,
  featured: false,
  createdAt: '',
};
const allowed: Record<string, string[]> = {
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Packed', 'Cancelled'],
  Packed: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
  Delivered: ['Returned'],
};
export function Admin() {
  const { user, ready, reload, toast, config } = useStore();
  const [section, setSection] = useState('overview');
  const [data, setData] = useState<State | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [query, setQuery] = useState('');
  const [refundConfirm, setRefundConfirm] = useState(false);
  async function refresh() {
    setLoading(true);
    try {
      setData(await api<State>('/admin/overview'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user?.role === 'admin') void refresh();
  }, [user]);
  async function action(path: string, method: string, payload?: unknown) {
    try {
      await api(path, send(method, payload));
      await refresh();
      await reload();
      toast('Changes saved.');
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    }
  }
  if (!ready) return <div className="page-wrap loading">Opening workspace…</div>;
  if (!user || user.role !== 'admin')
    return (
      <div className="page-wrap empty-state">
        <LayoutDashboard size={40} />
        <h1>Your store, behind the scenes.</h1>
        <p>Sign in with an administrator account to manage BRMotoGear.</p>
        <Link className="button" href="/account">
          Sign in {config?.demo ? '· demo admin available' : ''}
        </Link>
      </div>
    );
  const paid =
    data?.orders.filter(
      (o) =>
        o.paymentStatus === 'paid' &&
        !['Cancelled', 'Returned', 'Refund pending'].includes(o.status),
    ) || [];
  const revenue = paid.reduce((n, o) => n + o.total, 0);
  const low =
    data?.products.flatMap((p) =>
      p.variants.filter((v) => v.stock - v.reserved <= 5).map((v) => ({ ...v, name: p.name })),
    ) || [];
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <span className="eyebrow">STORE WORKSPACE</span>
        {sections.map((s) => (
          <button
            className={section === s.key ? 'active' : ''}
            key={s.key}
            onClick={() => {
              setSection(s.key);
              setEdit(null);
              setSelected(null);
              setQuery('');
            }}
          >
            <s.icon size={18} />
            {s.name}
            {s.key === 'messages' && !!data?.tickets.filter((t) => !t.resolved).length && (
              <span>{data.tickets.filter((t) => !t.resolved).length}</span>
            )}
          </button>
        ))}
        <Link href="/shop">
          <ArrowUpRight size={17} /> View storefront
        </Link>
        <small>{config?.demo ? 'DEMO WORKSPACE' : 'LIVE WORKSPACE'}</small>
      </aside>
      <div className="admin-main">
        <div className="admin-top">
          <div>
            <span className="eyebrow orange-text">BRMOTOGEAR / ADMIN</span>
            <h1>
              {edit
                ? edit.id
                  ? 'Edit helmet'
                  : 'Add a helmet'
                : selected
                  ? selected.number
                  : sections.find((s) => s.key === section)?.name}
            </h1>
          </div>
          <button
            className="button outline small"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>
        {error && <p className="form-error box">{error}</p>}
        {!data ? (
          <p>Loading store data…</p>
        ) : edit ? (
          <ProductEditor
            product={edit}
            onCancel={() => setEdit(null)}
            onSave={async (p) => {
              if (
                await action(
                  `/admin/products${edit.id ? `/${edit.id}` : ''}`,
                  edit.id ? 'PUT' : 'POST',
                  p,
                )
              )
                setEdit(null);
            }}
          />
        ) : selected ? (
          <div className="panel">
            <button className="text-link" onClick={() => setSelected(null)}>
              <ArrowLeft size={15} />
              All orders
            </button>
            <h2>{selected.number}</h2>
            <p>
              {selected.address.name} · {selected.address.email}
            </p>
            <p>
              {selected.address.address}, {selected.address.city}, {selected.address.state} —{' '}
              {selected.address.pincode}
            </p>
            <div className="order-stat-row">
              <span className="status-pill">{selected.status}</span>
              <strong>{money(selected.total)}</strong>
              <span>Payment: {selected.paymentStatus}</span>
            </div>
            {selected.items.map((i, n) => (
              <div className="checkout-item" key={n}>
                <Image src={i.image} alt={i.name} width={65} height={65} />
                <div>
                  <strong>{i.name}</strong>
                  <small>
                    {i.size} / {i.color} × {i.quantity}
                  </small>
                </div>
                <span>{money(i.price * i.quantity)}</span>
              </div>
            ))}
            {selected.paymentStatus === 'paid' && (
              <form
                className="admin-order-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const values = Object.fromEntries(new FormData(e.currentTarget).entries());
                  if (await action(`/admin/orders/${selected.id}`, 'PATCH', values))
                    setSelected(null);
                }}
              >
                <label>
                  Order status
                  <select name="status" aria-label="Order status" defaultValue={selected.status}>
                    {[selected.status, ...(allowed[selected.status] || [])].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Tracking reference
                  <input
                    name="tracking"
                    defaultValue={selected.tracking}
                    maxLength={200}
                    placeholder="Carrier name and tracking number"
                  />
                </label>
                <button className="button">Update order</button>
              </form>
            )}
            {['Cancelled', 'Returned', 'Payment review'].includes(selected.status) &&
              ['paid', 'refund_required'].includes(selected.paymentStatus) && (
                <div className="refund-box">
                  <p>
                    Refund the full {money(selected.total)} to the original payment method. Returned
                    stock is inspected and adjusted separately in Inventory.
                  </p>
                  {refundConfirm ? (
                    <>
                      <strong>Confirm this refund?</strong>
                      <button
                        className="button"
                        onClick={async () => {
                          if (await action(`/admin/orders/${selected.id}/refund`, 'POST')) {
                            setSelected(null);
                            setRefundConfirm(false);
                          }
                        }}
                      >
                        Confirm refund
                      </button>
                      <button className="button outline" onClick={() => setRefundConfirm(false)}>
                        Keep order
                      </button>
                    </>
                  ) : (
                    <button className="button outline" onClick={() => setRefundConfirm(true)}>
                      Issue full refund
                    </button>
                  )}
                </div>
              )}
            <h3>Status history</h3>
            <ol className="timeline">
              {selected.timeline.map((t, i) => (
                <li key={i}>
                  <span />
                  <div>
                    <strong>{t.status}</strong>
                    <small>{new Date(t.at).toLocaleString('en-IN')}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <>
            {section === 'overview' && (
              <>
                <div className="metric-grid">
                  {[
                    {
                      label: 'Sales collected',
                      value: money(revenue),
                      sub: `${paid.length} paid orders`,
                    },
                    {
                      label: 'Total orders',
                      value: data.orders.length,
                      sub: `${data.orders.filter((o) => o.status === 'Confirmed').length} ready to process`,
                    },
                    {
                      label: 'Riders',
                      value: data.users.filter((u) => u.role === 'customer').length,
                      sub: 'Customer accounts',
                    },
                    {
                      label: 'Low stock variants',
                      value: low.length,
                      sub: '5 or fewer units available',
                    },
                  ].map((m) => (
                    <div className="metric-card" key={m.label}>
                      <span>{m.label}</span>
                      <strong>{m.value}</strong>
                      <small>{m.sub}</small>
                    </div>
                  ))}
                </div>
                <div className="admin-two">
                  <section className="panel">
                    <div className="section-heading">
                      <h2>Sales by category</h2>
                      <span className="eyebrow">ALL TIME</span>
                    </div>
                    {categories.map((c) => {
                      const total = paid.reduce(
                        (n, o) =>
                          n +
                          o.items
                            .filter(
                              (i) =>
                                data.products.find((p) => p.id === i.productId)?.category === c,
                            )
                            .reduce((n, i) => n + i.price * i.quantity, 0),
                        0,
                      );
                      const max = Math.max(
                        1,
                        ...categories.map((cat) =>
                          paid.reduce(
                            (n, o) =>
                              n +
                              o.items
                                .filter(
                                  (i) =>
                                    data.products.find((p) => p.id === i.productId)?.category ===
                                    cat,
                                )
                                .reduce((n, i) => n + i.price * i.quantity, 0),
                            0,
                          ),
                        ),
                      );
                      return (
                        <div className="bar-chart-row" key={c}>
                          <div>
                            <span>{c}</span>
                            <strong>{money(total)}</strong>
                          </div>
                          <div className="bar-track">
                            <span style={{ width: `${(total / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <small className="muted">
                      Gross product totals before discounts and shipping.
                    </small>
                  </section>
                  <section className="panel">
                    <h2>Store pulse</h2>
                    <div className="summary-line">
                      <span>Active helmets</span>
                      <strong>{data.products.filter((p) => p.active).length}</strong>
                    </div>
                    <div className="summary-line">
                      <span>Pending payments</span>
                      <strong>{data.orders.filter((o) => o.reserved).length}</strong>
                    </div>
                    <div className="summary-line">
                      <span>Reviews to moderate</span>
                      <strong>{data.reviews.filter((r) => !r.approved).length}</strong>
                    </div>
                    <div className="summary-line">
                      <span>Open enquiries</span>
                      <strong>{data.tickets.filter((t) => !t.resolved).length}</strong>
                    </div>
                    <div className="summary-line">
                      <span>Payment reviews</span>
                      <strong>
                        {data.orders.filter((o) => o.paymentStatus === 'refund_required').length}
                      </strong>
                    </div>
                  </section>
                </div>
                <section className="panel">
                  <div className="section-heading">
                    <h2>Latest orders</h2>
                    <button className="text-link" onClick={() => setSection('orders')}>
                      All orders <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <OrderTable orders={data.orders.slice(-5).reverse()} onSelect={setSelected} />
                </section>
              </>
            )}
            {section === 'categories' && (
              <div className="admin-two">
                <div>
                  {data.categories.map((c) => (
                    <div className="panel" key={c.id}>
                      <h3>{c.name}</h3>
                      <p>
                        {data.products.filter((p) => p.category === c.name && p.active).length}{' '}
                        active helmets · {c.active ? 'Visible' : 'Hidden'}
                      </p>
                      <button
                        className="button outline small"
                        onClick={() =>
                          void action('/admin/categories/' + c.id, 'PATCH', { active: !c.active })
                        }
                      >
                        {c.active ? 'Hide category' : 'Show category'}
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  className="panel"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const name = new FormData(form).get('name');
                    if (await action('/admin/categories', 'POST', { name, active: true }))
                      form.reset();
                  }}
                >
                  <h2>Create category</h2>
                  <label>
                    Category name
                    <input name="name" required minLength={2} maxLength={50} />
                  </label>
                  <button className="button">Add category</button>
                </form>
              </div>
            )}
            {section === 'products' && (
              <>
                <div className="admin-toolbar">
                  <input
                    aria-label="Search products"
                    placeholder="Find a helmet…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button className="button" onClick={() => setEdit(structuredClone(blankProduct))}>
                    <Plus size={17} />
                    Add product
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Helmet</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Available stock</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products
                        .filter((p) =>
                          `${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase()),
                        )
                        .map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="table-product">
                                <Image src={p.images[0]} alt={p.name} width={50} height={50} />
                                <div>
                                  <strong>{p.name}</strong>
                                  <small>{p.brand}</small>
                                </div>
                              </div>
                            </td>
                            <td>{p.category}</td>
                            <td>{money(p.price)}</td>
                            <td>{p.variants.reduce((n, v) => n + v.stock - v.reserved, 0)}</td>
                            <td>
                              <span className="status-pill">
                                {p.active ? 'Active' : 'Archived'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="underlined"
                                onClick={() => setEdit(structuredClone(p))}
                              >
                                Edit
                              </button>
                              {p.active && (
                                <button
                                  className="underlined muted"
                                  onClick={() => void action(`/admin/products/${p.id}`, 'DELETE')}
                                >
                                  Archive
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {section === 'inventory' && (
              <>
                <p className="muted">
                  Stock is tracked per size and colour. Reserved units cannot be removed. Edit a
                  product to adjust stock after inspecting returns.
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product / variant</th>
                        <th>On hand</th>
                        <th>Reserved</th>
                        <th>Available</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.flatMap((p) =>
                        p.variants.map((v) => (
                          <tr key={`${p.id}-${v.size}-${v.color}`}>
                            <td>
                              <strong>{p.name}</strong>
                              <small>
                                {v.color} / {v.size}
                              </small>
                            </td>
                            <td>{v.stock}</td>
                            <td>{v.reserved}</td>
                            <td>
                              <span className={v.stock - v.reserved <= 5 ? 'low-stock' : ''}>
                                {v.stock - v.reserved}
                              </span>
                            </td>
                            <td>
                              <button
                                className="underlined"
                                onClick={() => setEdit(structuredClone(p))}
                              >
                                Adjust stock
                              </button>
                            </td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {section === 'orders' && (
              <>
                <div className="admin-toolbar">
                  <input
                    aria-label="Search orders"
                    placeholder="Order number or customer…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <OrderTable
                  orders={data.orders
                    .filter((o) =>
                      `${o.number} ${o.address.name} ${o.address.email} ${o.status}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .reverse()}
                  onSelect={(o) => {
                    setSelected(o);
                    setRefundConfirm(false);
                  }}
                />
              </>
            )}
            {section === 'customers' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rider</th>
                      <th>Joined</th>
                      <th>Orders</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>{data.orders.filter((o) => o.userId === u.id).length}</td>
                        <td>{u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {section === 'coupons' && (
              <div className="admin-two">
                <div>
                  {data.coupons.map((c) => (
                    <div className="panel coupon-card" key={c.id}>
                      <div>
                        <Tag className="orange-text" />
                        <h3>{c.code}</h3>
                        <span className="status-pill">{c.active ? 'Active' : 'Disabled'}</span>
                      </div>
                      <p>
                        {c.percent}% off · maximum {money(c.maximum)} · minimum {money(c.minimum)}
                      </p>
                      <small>
                        Expires {new Date(c.expiresAt).toLocaleDateString('en-IN')} · {c.limit}{' '}
                        total uses · {c.perUser} per rider
                      </small>
                      {c.active && (
                        <button
                          className="underlined"
                          onClick={() => void action(`/admin/coupons/${c.id}`, 'DELETE')}
                        >
                          Disable coupon
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <form
                  className="panel"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    const payload = {
                      code: String(f.get('code')).toUpperCase(),
                      percent: Number(f.get('percent')),
                      minimum: Number(f.get('minimum')) * 100,
                      maximum: Number(f.get('maximum')) * 100,
                      limit: Number(f.get('limit')),
                      perUser: Number(f.get('perUser')),
                      expiresAt: new Date(`${f.get('expiresAt')}T23:59:59+05:30`).toISOString(),
                      active: true,
                      categories: f.getAll('categories'),
                      productIds: f.getAll('productIds'),
                    };
                    if (await action('/admin/coupons', 'POST', payload)) form.reset();
                  }}
                >
                  <h2>Create or update coupon</h2>
                  <label>
                    Code
                    <input
                      name="code"
                      pattern="[A-Za-z0-9]{3,30}"
                      required
                      placeholder="WELCOME10"
                    />
                  </label>
                  <div className="form-grid">
                    {[
                      { name: 'percent', label: 'Discount %', value: 10 },
                      { name: 'minimum', label: 'Minimum spend ₹', value: 2000 },
                      { name: 'maximum', label: 'Maximum discount ₹', value: 500 },
                      { name: 'limit', label: 'Total uses', value: 100 },
                      { name: 'perUser', label: 'Uses per rider', value: 1 },
                    ].map((f) => (
                      <label key={f.name}>
                        {f.label}
                        <input
                          type="number"
                          name={f.name}
                          defaultValue={f.value}
                          required
                          min={f.name === 'minimum' ? 0 : 1}
                          max={f.name === 'percent' ? 100 : 1000000}
                        />
                      </label>
                    ))}
                    <label>
                      Expires on
                      <input name="expiresAt" type="date" required />
                    </label>
                    <label>
                      Eligible categories
                      <select name="categories" aria-label="Eligible categories" multiple size={3}>
                        {data.categories
                          .filter((c) => c.active)
                          .map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Eligible products
                      <select name="productIds" aria-label="Eligible products" multiple size={3}>
                        {data.products
                          .filter((p) => p.active)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <p className="small-note">
                    Leave selections empty to include all products. If both restrictions are set, a
                    product must match both. Minimum spend applies to eligible products.
                  </p>
                  <button className="button">Save coupon</button>
                </form>
              </div>
            )}
            {section === 'reviews' && (
              <>
                {!data.reviews.length ? (
                  <div className="empty-state compact">
                    <Star size={35} />
                    <h2>No reviews to moderate.</h2>
                    <p>Reviews are available to customers after delivery.</p>
                  </div>
                ) : (
                  data.reviews.map((r) => (
                    <article className="panel review" key={r.id}>
                      <span className="stars">{'★'.repeat(r.rating)}</span>
                      <h3>{data.products.find((p) => p.id === r.productId)?.name}</h3>
                      <p>{r.text}</p>
                      <small>
                        {r.name} · {r.approved ? 'Published' : 'Awaiting moderation'}
                      </small>
                      {r.image && (
                        <a href={r.image} target="_blank" rel="noreferrer">
                          View customer image
                        </a>
                      )}
                      <button
                        className="button outline small"
                        onClick={() =>
                          void action(`/admin/reviews/${r.id}`, 'PATCH', { approved: !r.approved })
                        }
                      >
                        {r.approved ? 'Unpublish' : 'Approve review'}
                      </button>
                    </article>
                  ))
                )}
              </>
            )}
            {section === 'messages' && (
              <>
                {!data.tickets.length ? (
                  <div className="empty-state compact">
                    <MessageSquare size={35} />
                    <h2>The inbox is clear.</h2>
                    <p>Customer contact forms appear here.</p>
                  </div>
                ) : (
                  data.tickets
                    .slice()
                    .reverse()
                    .map((t) => (
                      <article className="panel" key={t.id}>
                        <span className="status-pill">{t.resolved ? 'Resolved' : 'Open'}</span>
                        <h3>{t.name}</h3>
                        <a className="underlined" href={`mailto:${t.email}`}>
                          {t.email}
                        </a>
                        <p className="pre-wrap">{t.message}</p>
                        <small>{new Date(t.createdAt).toLocaleString('en-IN')}</small>
                        {!t.resolved && (
                          <button
                            className="button outline small"
                            onClick={() => void action(`/admin/tickets/${t.id}`, 'PATCH')}
                          >
                            Mark resolved
                          </button>
                        )}
                      </article>
                    ))
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
function OrderTable({ orders, onSelect }: { orders: Order[]; onSelect: (o: Order) => void }) {
  return orders.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{o.number}</strong>
                <small>{new Date(o.createdAt).toLocaleDateString('en-IN')}</small>
              </td>
              <td>{o.address.name}</td>
              <td>{money(o.total)}</td>
              <td>{o.paymentStatus.replace('_', ' ')}</td>
              <td>
                <span className="status-pill">{o.status}</span>
              </td>
              <td>
                <button className="underlined" onClick={() => onSelect(o)}>
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="muted">No orders yet. Completed checkouts will appear here.</p>
  );
}
function ProductEditor({
  product,
  onCancel,
  onSave,
}: {
  product: Product;
  onCancel: () => void;
  onSave: (p: Product) => Promise<void>;
}) {
  const { config } = useStore();
  const [p, setP] = useState(product);
  const [busy, setBusy] = useState(false);
  const [specs, setSpecs] = useState(
    Object.entries(product.specifications)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n'),
  );
  const update = (field: keyof Product, value: unknown) => setP({ ...p, [field]: value });
  return (
    <form
      className="panel product-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave({
          ...p,
          specifications: Object.fromEntries(
            specs
              .split('\n')
              .filter((l) => l.includes(':'))
              .map((l) => {
                const i = l.indexOf(':');
                return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
              }),
          ),
        });
        setBusy(false);
      }}
    >
      <button type="button" className="text-link" onClick={onCancel}>
        <ArrowLeft size={16} />
        Back to products
      </button>
      <div className="form-grid">
        <label>
          Product name
          <input
            required
            value={p.name}
            onChange={(e) => {
              setP({
                ...p,
                name: e.target.value,
                slug: p.id
                  ? p.slug
                  : e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, ''),
              });
            }}
          />
        </label>
        <label>
          URL slug
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={p.slug}
            onChange={(e) => update('slug', e.target.value)}
          />
        </label>
        <label>
          Brand
          <input required value={p.brand} onChange={(e) => update('brand', e.target.value)} />
        </label>
        <label>
          Category
          <select value={p.category} onChange={(e) => update('category', e.target.value)}>
            {(config?.categories || categories).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Selling price ₹
          <input
            type="number"
            min={1}
            step="0.01"
            required
            value={p.price / 100}
            onChange={(e) => update('price', Math.round(Number(e.target.value) * 100))}
          />
        </label>
        <label>
          MRP ₹
          <input
            type="number"
            min={p.price / 100}
            step="0.01"
            required
            value={p.mrp / 100}
            onChange={(e) => update('mrp', Math.round(Number(e.target.value) * 100))}
          />
        </label>
        <label className="full-field">
          Description
          <textarea
            required
            minLength={10}
            rows={3}
            value={p.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </label>
        <label className="full-field">
          Image URLs (one per line)
          <textarea
            required
            rows={3}
            value={p.images.join('\n')}
            onChange={(e) => update('images', e.target.value.split('\n'))}
          />
          <small>
            Use /images/filename.jpg, cdn.shopify.com or images.unsplash.com. Configure other
            trusted hosts in the application before using them.
          </small>
        </label>
        <label className="full-field">
          Verified certification information
          <input
            required
            value={p.certification}
            onChange={(e) => update('certification', e.target.value)}
          />
        </label>
        <label>
          Features (one per line)
          <textarea
            rows={4}
            value={p.features.join('\n')}
            onChange={(e) => update('features', e.target.value.split('\n'))}
          />
        </label>
        <label>
          Specifications (label: value)
          <textarea rows={4} value={specs} onChange={(e) => setSpecs(e.target.value)} />
        </label>
      </div>
      <h3>Size & colour inventory</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Size</th>
              <th>Colour</th>
              <th>On hand</th>
              <th>Reserved</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {p.variants.map((v, i) => (
              <tr key={i}>
                <td>
                  <input
                    aria-label={`Variant ${i + 1} size`}
                    required
                    value={v.size}
                    onChange={(e) =>
                      update(
                        'variants',
                        p.variants.map((v, j) => (j === i ? { ...v, size: e.target.value } : v)),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`Variant ${i + 1} colour`}
                    required
                    value={v.color}
                    onChange={(e) =>
                      update(
                        'variants',
                        p.variants.map((v, j) => (j === i ? { ...v, color: e.target.value } : v)),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`Variant ${i + 1} stock`}
                    type="number"
                    min={v.reserved}
                    required
                    value={v.stock}
                    onChange={(e) =>
                      update(
                        'variants',
                        p.variants.map((v, j) =>
                          j === i ? { ...v, stock: Number(e.target.value) } : v,
                        ),
                      )
                    }
                  />
                </td>
                <td>{v.reserved}</td>
                <td>
                  <button
                    type="button"
                    aria-label={`Remove variant ${i + 1}`}
                    disabled={v.reserved > 0 || p.variants.length === 1}
                    className="icon-button"
                    onClick={() =>
                      update(
                        'variants',
                        p.variants.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="text-link"
        onClick={() =>
          update('variants', [...p.variants, { size: '', color: '', stock: 0, reserved: 0 }])
        }
      >
        <Plus size={16} />
        Add variant
      </button>
      <div className="editor-flags">
        <label className="check-label">
          <input
            type="checkbox"
            checked={p.active}
            onChange={(e) => update('active', e.target.checked)}
          />
          Active in storefront
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={p.featured}
            onChange={(e) => update('featured', e.target.checked)}
          />
          Featured product
        </label>
      </div>
      <button disabled={busy} className="button">
        <Save size={17} />
        {busy ? 'Saving…' : 'Save product'}
      </button>
    </form>
  );
}
