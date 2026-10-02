'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  LockKeyhole,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from './store';
import { money, type Address, type Order, type PublicUser } from '@/lib/types';
import { api, send } from '@/lib/api';
type Quote = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: string;
};
export function Bag() {
  const { cart, setCart, products, ready, user, toast } = useStore();
  const [coupon, setCoupon] = useState('');
  const [totals, setTotals] = useState<Quote | null>(null);
  const [couponError, setCouponError] = useState('');
  const subtotal = cart.reduce(
    (n, i) => n + (products.find((p) => p.id === i.productId)?.price || 0) * i.quantity,
    0,
  );
  const shipping = subtotal >= 200000 ? 0 : 9900;
  useEffect(() => {
    setTotals(null);
  }, [cart]);
  if (!ready) return <div className="page-wrap loading">Opening your bag…</div>;
  if (!cart.length)
    return (
      <div className="page-wrap empty-state">
        <ShoppingBag size={46} strokeWidth={1} />
        <span className="eyebrow orange-text">THE NEXT RIDE AWAITS</span>
        <h1>Your bag is taking a breather.</h1>
        <p>Find a helmet that’s built for your ride.</p>
        <Link href="/shop" className="button">
          Explore helmets <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <div className="page-wrap">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>Your bag
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow orange-text">GEAR UP FOR WHAT’S NEXT</span>
          <h1>Your riding essentials.</h1>
        </div>
        <span>{cart.reduce((n, i) => n + i.quantity, 0)} items</span>
      </div>
      <div className="checkout-layout">
        <div className="cart-items">
          {cart.map((item, index) => {
            const p = products.find((p) => p.id === item.productId);
            return (
              <article className="cart-item" key={`${item.productId}-${item.size}-${item.color}`}>
                <Link className="cart-image" href={p ? `/product/${p.slug}` : '/shop'}>
                  {p && <Image src={p.images[0]} alt={p.name} fill sizes="140px" />}
                </Link>
                <div className="cart-copy">
                  <span className="eyebrow">{p?.brand || 'UNAVAILABLE'}</span>
                  <Link href={p ? `/product/${p.slug}` : '/shop'}>
                    <h3>{p?.name || 'Product no longer available'}</h3>
                  </Link>
                  <p>
                    {item.color} <span>/</span> Size {item.size}
                  </p>
                  <div className="quantity small">
                    <button
                      aria-label={`Decrease ${p?.name} quantity`}
                      disabled={item.quantity <= 1}
                      onClick={() =>
                        setCart(
                          cart.map((x, i) =>
                            i === index ? { ...x, quantity: x.quantity - 1 } : x,
                          ),
                        )
                      }
                    >
                      <Minus size={14} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      aria-label={`Increase ${p?.name} quantity`}
                      disabled={item.quantity >= 10}
                      onClick={() =>
                        setCart(
                          cart.map((x, i) =>
                            i === index ? { ...x, quantity: x.quantity + 1 } : x,
                          ),
                        )
                      }
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="cart-end">
                  <strong>{money((p?.price || 0) * item.quantity)}</strong>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${p?.name} from bag`}
                    onClick={() => setCart(cart.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            );
          })}
          <Link className="text-link" href="/shop">
            Continue exploring <ArrowRight size={16} />
          </Link>
        </div>
        <aside className="order-summary">
          <h2>The ride ahead</h2>
          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{money(totals?.subtotal ?? subtotal)}</strong>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <strong>{(totals?.shipping ?? shipping) === 0 ? 'On us' : money(shipping)}</strong>
          </div>
          {!!totals?.discount && (
            <div className="summary-line saving">
              <span>{totals.coupon}</span>
              <strong>−{money(totals.discount)}</strong>
            </div>
          )}
          <form
            className="coupon-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user) {
                setCouponError('Sign in to apply a coupon.');
                return;
              }
              try {
                const result = await api<Quote>(
                  '/cart/quote',
                  send('POST', { items: cart, coupon }),
                );
                setTotals(result);
                sessionStorage.setItem('brmoto-coupon', result.coupon);
                setCouponError('');
                toast('Coupon applied.');
              } catch (e) {
                setCouponError((e as Error).message);
              }
            }}
          >
            <input
              aria-label="Coupon code"
              placeholder="Have a discount code?"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            />
            <button>Apply</button>
          </form>
          {couponError && (
            <p className="form-error" role="alert">
              {couponError}
            </p>
          )}
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(totals?.total ?? subtotal + shipping)}</strong>
          </div>
          <small className="muted">Inclusive of all taxes. Final total verified at checkout.</small>
          <Link className="button full" href="/checkout">
            Continue to checkout <ArrowRight size={18} />
          </Link>
          <p className="secure-note">
            <LockKeyhole size={14} /> Your next adventure, securely checked out.
          </p>
        </aside>
      </div>
    </div>
  );
}
type RazorpayResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}
async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Payment checkout could not load. Please try again.'));
    document.body.appendChild(script);
  });
}
export function Checkout() {
  const { cart, products, user, config, ready, setCart, reload, updateUser } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const resumeId = params.get('order');
  const [totals, setTotals] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [stage, setStage] = useState<'address' | 'payment'>('address');
  const key = useRef('');
  const [saveAddress, setSaveAddress] = useState(true);
  useEffect(() => {
    key.current = crypto.randomUUID();
    setCoupon(sessionStorage.getItem('brmoto-coupon') || '');
  }, []);
  useEffect(() => {
    if (!resumeId || !user) return;
    api<Order>(`/orders/${resumeId}`)
      .then((o) => {
        if (o.paymentStatus === 'paid') {
          router.replace(`/order/${o.id}`);
          return;
        }
        setOrder(o);
        setStage('payment');
      })
      .catch((e) => setError(e.message));
  }, [resumeId, user, router]);
  useEffect(() => {
    if (!user || !cart.length || order || resumeId) return;
    api<Quote>('/cart/quote', send('POST', { items: cart, coupon }))
      .then((t) => {
        setTotals(t);
        setError('');
      })
      .catch((e) => {
        setTotals(null);
        setError(e.message);
      });
  }, [user, cart, coupon, order, resumeId]);
  const finish = (o: Order) => {
    if (o.paymentStatus !== 'paid') {
      setError('Your payment needs review. Visit your orders for the latest status.');
      setBusy(false);
      return;
    }
    setCart([]);
    void reload();
    sessionStorage.removeItem('brmoto-coupon');
    router.push(`/order/${o.id}`);
  };
  if (!ready) return <div className="page-wrap loading">Preparing checkout…</div>;
  if (resumeId && user && !order)
    return (
      <div className="page-wrap empty-state">
        <h2>{error || 'Resuming your checkout…'}</h2>
        {error && (
          <Link href="/account/orders" className="button">
            Back to your orders
          </Link>
        )}
      </div>
    );
  if (!user)
    return (
      <div className="page-wrap empty-state">
        <LockKeyhole size={40} />
        <h1>One quick stop before the ride.</h1>
        <p>Sign in or create an account to keep your order and delivery details together.</p>
        <Link className="button" href="/account?next=checkout">
          Sign in to checkout <ArrowRight size={18} />
        </Link>
      </div>
    );
  if (!cart.length && !order)
    return (
      <div className="page-wrap empty-state">
        <h1>Your bag is empty.</h1>
        <Link href="/shop" className="button">
          Find your helmet
        </Link>
      </div>
    );
  async function prepare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    const address = Object.fromEntries(f.entries()) as Address;
    try {
      if (saveAddress)
        updateUser(
          await api<PublicUser>(
            '/account',
            send('PUT', {
              name: user!.name,
              addresses: [
                address,
                ...user!.addresses.filter((a) => a.address !== address.address),
              ].slice(0, 5),
            }),
          ),
        );
      const o = await api<Order>(
        '/orders',
        send('POST', { items: cart, address, coupon, idempotencyKey: key.current }),
      );
      setOrder(o);
      setStage('payment');
      router.replace(`/checkout?order=${o.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    if (!order) return;
    setBusy(true);
    setError('');
    try {
      const payment = await api<{
        demo: boolean;
        key: string;
        orderId: string;
        amount: number;
        currency: string;
      }>('/payments/create-order', send('POST', { orderId: order.id }));
      if (payment.demo) {
        finish(await api<Order>('/payments/demo', send('POST', { orderId: order.id })));
        return;
      }
      await loadRazorpay();
      const checkout = new window.Razorpay({
        key: payment.key,
        amount: payment.amount,
        currency: 'INR',
        order_id: payment.orderId,
        name: 'BRMotoGear',
        description: order.number,
        prefill: {
          name: order.address.name,
          email: order.address.email,
          contact: order.address.phone,
        },
        theme: { color: '#f36b32' },
        handler: async (response: RazorpayResult) => {
          try {
            finish(
              await api<Order>(
                '/payments/verify',
                send('POST', { ...response, orderId: order.id }),
              ),
            );
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError(
              'Payment was not completed. You can retry or check your orders for the latest status.',
            );
          },
        },
      });
      checkout.on('payment.failed', () => {
        setError(
          'Payment could not be completed. Check your orders before retrying if your bank shows a debit.',
        );
        setBusy(false);
      });
      checkout.open();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const saved = user.addresses[0];
  return (
    <div className="page-wrap checkout-page">
      <div className="checkout-top">
        <span className="eyebrow orange-text">ALMOST READY TO RIDE</span>
        <h1>A few details. Then open roads.</h1>
        <div className="checkout-steps">
          <span className="active">01 — Delivery</span>
          <ArrowRight size={16} />
          <span className={stage === 'payment' ? 'active' : ''}>02 — Payment</span>
          <ArrowRight size={16} />
          <span>03 — All set</span>
        </div>
      </div>
      <div className="checkout-layout">
        <div>
          {error && (
            <div className="form-error box" role="alert">
              {error}
              {coupon && (
                <button
                  onClick={() => {
                    setCoupon('');
                    sessionStorage.removeItem('brmoto-coupon');
                  }}
                >
                  Remove coupon
                </button>
              )}
            </div>
          )}
          {stage === 'address' ? (
            <form className="panel address-form" onSubmit={prepare}>
              <h2>Where are we headed?</h2>
              <div className="form-grid">
                {[
                  {
                    name: 'name',
                    label: 'Full name',
                    type: 'text',
                    auto: 'name',
                    value: saved?.name || user.name,
                  },
                  {
                    name: 'email',
                    label: 'Email address',
                    type: 'email',
                    auto: 'email',
                    value: saved?.email || user.email,
                  },
                  {
                    name: 'phone',
                    label: 'Mobile number',
                    type: 'tel',
                    auto: 'tel-national',
                    value: saved?.phone || '',
                  },
                  {
                    name: 'pincode',
                    label: 'PIN code',
                    type: 'text',
                    auto: 'postal-code',
                    value: saved?.pincode || '',
                  },
                  {
                    name: 'address',
                    label: 'House, street & locality',
                    type: 'text',
                    auto: 'street-address',
                    value: saved?.address || '',
                  },
                  {
                    name: 'city',
                    label: 'City',
                    type: 'text',
                    auto: 'address-level2',
                    value: saved?.city || '',
                  },
                  {
                    name: 'state',
                    label: 'State',
                    type: 'text',
                    auto: 'address-level1',
                    value: saved?.state || '',
                  },
                ].map((field) => (
                  <label className={field.name === 'address' ? 'full-field' : ''} key={field.name}>
                    {field.label}
                    <input
                      name={field.name}
                      type={field.type}
                      autoComplete={field.auto}
                      required
                      defaultValue={field.value}
                      pattern={
                        field.name === 'phone'
                          ? '[6-9][0-9]{9}'
                          : field.name === 'pincode'
                            ? '[1-9][0-9]{5}'
                            : undefined
                      }
                      maxLength={field.name === 'phone' ? 10 : field.name === 'pincode' ? 6 : 200}
                    />
                  </label>
                ))}
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                />
                Save this address to my account
              </label>
              <p className="small-note">
                {config?.demo
                  ? 'Demo delivery: all valid Indian PIN codes are accepted. No parcel will be shipped.'
                  : 'Shipping is offered within India. Delivery times and serviceability are confirmed by rider support.'}
              </p>
              <button disabled={busy || !totals} className="button full">
                {busy ? 'Preparing your order…' : 'Continue to payment'}
                <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <div className="panel payment-panel">
              <ShieldCheck size={40} className="orange-text" />
              <h2>{config?.demo ? 'Try the complete checkout.' : 'Ready when you are.'}</h2>
              <p>
                {config?.demo
                  ? 'This is a simulated payment. No card details, bank account or money are involved.'
                  : 'Your payment is completed securely through Razorpay. Choose UPI, cards or another available payment method.'}
              </p>
              <div className="delivery-recap">
                <strong>Delivering to {order?.address.name}</strong>
                <p>
                  {order?.address.address}, {order?.address.city}, {order?.address.state} —{' '}
                  {order?.address.pincode}
                </p>
                <p>{order?.address.phone}</p>
              </div>
              <p className="small-note">
                Your sizes are reserved for 30 minutes from order creation.
              </p>
              <button className="button full" disabled={busy} onClick={() => void pay()}>
                {busy
                  ? 'Verifying payment…'
                  : config?.demo
                    ? 'Complete demo payment'
                    : `Pay ${money(order?.total || 0)}`}
                <LockKeyhole size={17} />
              </button>
              <Link href="/account/orders" className="text-link">
                View pending orders <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
        <aside className="order-summary">
          <h2>In your bag</h2>
          {(order?.items || cart).map((i) => {
            const p = products.find((p) => p.id === i.productId);
            const line = order?.items.find(
              (line) =>
                line.productId === i.productId && line.size === i.size && line.color === i.color,
            );
            return (
              <div className="checkout-item" key={`${i.productId}-${i.size}-${i.color}`}>
                {(line || p) && (
                  <Image
                    src={line?.image || p!.images[0]}
                    alt={line?.name || p!.name}
                    width={64}
                    height={64}
                  />
                )}
                <div>
                  <strong>{line?.name || p?.name}</strong>
                  <small>
                    {i.color} / {i.size} / Qty {i.quantity}
                  </small>
                </div>
                <span>{money((line?.price || p?.price || 0) * i.quantity)}</span>
              </div>
            );
          })}
          <div className="summary-line">
            <span>Subtotal</span>
            <span>{money((order || totals)?.subtotal || 0)}</span>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <span>
              {(order || totals)?.shipping ? money((order || totals)!.shipping) : 'On us'}
            </span>
          </div>
          {!!(order || totals)?.discount && (
            <div className="summary-line saving">
              <span>Discount</span>
              <span>−{money((order || totals)!.discount)}</span>
            </div>
          )}
          <div className="summary-total">
            <span>Total</span>
            <strong>{money((order || totals)?.total || 0)}</strong>
          </div>
          <p className="secure-note">
            <LockKeyhole size={14} /> {config?.demo ? 'Simulated payment' : 'Secured by Razorpay'}
          </p>
        </aside>
      </div>
    </div>
  );
}
export function OrderPage({ id }: { id: string }) {
  const { ready, user } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (ready && user)
      api<Order>(`/orders/${id}`)
        .then(setOrder)
        .catch((e) => setError(e.message));
  }, [id, ready, user]);
  if (!ready) return <div className="page-wrap loading">Loading your order…</div>;
  if (!user)
    return (
      <div className="page-wrap empty-state">
        <h1>Sign in to view your order.</h1>
        <Link href="/account" className="button">
          My account
        </Link>
      </div>
    );
  if (!order)
    return (
      <div className="page-wrap empty-state">
        <h1>{error || 'Getting the details…'}</h1>
      </div>
    );
  return (
    <div className="page-wrap order-page">
      <div className="order-confirmation">
        <span className="success-circle">
          <Check size={32} />
        </span>
        <span className="eyebrow orange-text">{order.number}</span>
        <h1>
          {order.paymentStatus === 'paid'
            ? 'You’re one step closer to the ride.'
            : order.paymentStatus === 'pending'
              ? 'Your order is awaiting payment.'
              : 'Your order, at a glance.'}
        </h1>
        <p>
          {order.paymentStatus === 'paid'
            ? `Thanks, ${order.address.name.split(' ')[0]}. Your order is confirmed.`
            : 'Check the current status below or contact rider support.'}
        </p>
        <span className="status-pill">{order.status}</span>
      </div>
      <div className="checkout-layout">
        <div className="panel">
          <h2>The journey so far</h2>
          <ol className="timeline">
            {order.timeline.map((event, i) => (
              <li key={i}>
                <span />
                <div>
                  <strong>{event.status}</strong>
                  <small>{new Date(event.at).toLocaleString('en-IN')}</small>
                </div>
              </li>
            ))}
          </ol>
          {order.tracking && (
            <p>
              <strong>Tracking reference:</strong> {order.tracking}
            </p>
          )}
          <h3>Your gear</h3>
          {order.items.map((i, index) => (
            <div className="checkout-item" key={index}>
              <Image src={i.image} alt={i.name} width={70} height={70} />
              <div>
                <strong>{i.name}</strong>
                <small>
                  {i.color} / Size {i.size} / Qty {i.quantity}
                </small>
              </div>
              <span>{money(i.price * i.quantity)}</span>
            </div>
          ))}
        </div>
        <aside className="order-summary">
          <h2>Delivery details</h2>
          <p>
            <strong>{order.address.name}</strong>
            <br />
            {order.address.address}
            <br />
            {order.address.city}, {order.address.state}
            <br />
            {order.address.pincode}
          </p>
          <p>{order.address.phone}</p>
          <div className="summary-total">
            <span>Order total</span>
            <strong>{money(order.total)}</strong>
          </div>
          <p>Payment: {order.paymentStatus.replace('_', ' ')}</p>
          <Link href="/account/orders" className="button outline full">
            All your orders
          </Link>
          <Link href="/shop" className="text-link">
            Back to the open road <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
