'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, UserRound, Package, Heart, MapPin, LogOut, ShieldCheck } from 'lucide-react';
import { useStore } from './store';
import { OtpLogin } from './otp-login';
import { api, send } from '@/lib/api';
import { money, type PublicUser, type Order } from '@/lib/types';
export function Account({ section = 'profile' }: { section?: string }) {
  const { user, ready, config, login, logout, toast } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (user && section === 'orders') {
      setLoading(true);
      api<Order[]>('/orders')
        .then(setOrders)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [user, section]);
  async function authenticate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      const u = await api<PublicUser>(
        `/auth/${register ? 'register' : 'login'}`,
        send('POST', data),
      );
      await login(u);
      router.push(params.get('next') === 'checkout' ? '/checkout' : '/account');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function demoLogin(role: string) {
    setBusy(true);
    setError('');
    try {
      const u = await api<PublicUser>('/auth/demo', send('POST', { role }));
      await login(u);
      router.push(
        role === 'admin' ? '/admin' : params.get('next') === 'checkout' ? '/checkout' : '/account',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <div className="page-wrap loading">Opening your account…</div>;
  if (!user)
    return (
      <div className="auth-layout">
        <div className="auth-art">
          <span className="eyebrow orange-text">THE ROAD IS BETTER TOGETHER</span>
          <h1>
            Your next
            <br />
            chapter
            <br />
            <em>starts here.</em>
          </h1>
          <p>
            Save your favourites. Follow your orders.
            <br />
            Get ready for the next ride.
          </p>
        </div>
        <div className="auth-form">
          <UserRound size={28} />
          <h2>{register ? 'Join the ride.' : 'Welcome back, rider.'}</h2>
          <p>
            {register
              ? 'Create your BRMotoGear account.'
              : 'Sign in to pick up where you left off.'}
          </p>
          <form onSubmit={authenticate}>
            {register && (
              <label>
                Your name
                <input name="name" autoComplete="name" minLength={2} maxLength={100} required />
              </label>
            )}
            <label>
              Email address
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                minLength={register ? 10 : 1}
                maxLength={128}
                required
              />
            </label>
            {register && <small className="muted">Use at least 10 characters.</small>}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button disabled={busy} className="button full">
              {busy ? 'One moment…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>
          {!register && config?.otp && (
            <OtpLogin
              onLogin={async (u) => {
                await login(u);
                router.push(params.get('next') === 'checkout' ? '/checkout' : '/account');
              }}
            />
          )}
          <p className="auth-switch">
            {register ? 'Already part of the ride?' : 'New around here?'}{' '}
            <button
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          {config?.demo && (
            <div className="demo-login">
              <span>EXPLORE THE DEMO</span>
              <div>
                <button
                  disabled={busy}
                  className="button outline"
                  onClick={() => void demoLogin('customer')}
                >
                  Rider account
                </button>
                <button
                  disabled={busy}
                  className="button outline"
                  onClick={() => void demoLogin('admin')}
                >
                  Admin account
                </button>
              </div>
              <small>Shared demo accounts. Use fictional details.</small>
            </div>
          )}
        </div>
      </div>
    );
  return (
    <div className="page-wrap">
      <div className="page-heading">
        <div>
          <span className="eyebrow orange-text">YOUR RIDER SPACE</span>
          <h1>Hey, {user.name.split(' ')[0]}.</h1>
          <p>Everything you need for the journey ahead.</p>
        </div>
      </div>
      <div className="account-layout">
        <aside className="account-nav">
          {[
            { icon: UserRound, label: 'My profile', href: '/account', key: 'profile' },
            { icon: Package, label: 'My orders', href: '/account/orders', key: 'orders' },
            {
              icon: MapPin,
              label: 'Saved addresses',
              href: '/account/addresses',
              key: 'addresses',
            },
            { icon: Heart, label: 'Wishlist', href: '/wishlist', key: 'wishlist' },
          ].map((i) => (
            <Link key={i.key} className={section === i.key ? 'active' : ''} href={i.href}>
              <i.icon size={18} />
              {i.label}
            </Link>
          ))}
          {user.role === 'admin' && (
            <Link href="/admin">
              <ShieldCheck size={18} />
              Admin workspace
            </Link>
          )}
          <button onClick={() => void logout().catch((e) => toast(e.message))}>
            <LogOut size={18} />
            Sign out
          </button>
        </aside>
        <div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {section === 'orders' ? (
            <>
              <h2>Your orders</h2>
              {loading ? (
                <p>Loading orders…</p>
              ) : !orders.length ? (
                <div className="empty-state compact">
                  <Package size={36} />
                  <h3>Your first ride with us starts here.</h3>
                  <p>Orders will appear here after checkout.</p>
                  <Link href="/shop" className="button">
                    Find your helmet
                  </Link>
                </div>
              ) : (
                orders.map((o) => (
                  <article className="account-order panel" key={o.id}>
                    <div>
                      <span className="eyebrow">{o.number}</span>
                      <span className="status-pill">{o.status}</span>
                    </div>
                    <h3>{o.items.map((i) => i.name).join(', ')}</h3>
                    <p>
                      {new Date(o.createdAt).toLocaleDateString('en-IN')} ·{' '}
                      {o.items.reduce((n, i) => n + i.quantity, 0)} items ·{' '}
                      <strong>{money(o.total)}</strong>
                    </p>
                    <div className="order-links">
                      <Link href={`/order/${o.id}`} className="text-link">
                        View order <ArrowRight size={16} />
                      </Link>
                      {o.reserved && o.paymentStatus === 'pending' && (
                        <Link className="text-link" href={`/checkout?order=${o.id}`}>
                          Resume payment <ArrowRight size={16} />
                        </Link>
                      )}
                      {o.reserved && o.paymentStatus === 'pending' && (
                        <button
                          className="underlined"
                          onClick={async () => {
                            try {
                              await api(`/orders/${o.id}/cancel`, send('POST'));
                              setOrders(await api<Order[]>('/orders'));
                              toast('Pending order cancelled. You can start a fresh checkout.');
                            } catch (e) {
                              toast((e as Error).message);
                            }
                          }}
                        >
                          Cancel pending order
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </>
          ) : section === 'addresses' ? (
            <>
              <h2>Saved addresses</h2>
              {user.addresses.length ? (
                user.addresses.map((a, i) => (
                  <div key={i} className="panel address-card">
                    <h3>{a.name}</h3>
                    <p>
                      {a.address}
                      <br />
                      {a.city}, {a.state} — {a.pincode}
                    </p>
                    <p>{a.phone}</p>
                    <button
                      className="underlined"
                      onClick={async () => {
                        try {
                          const u = await api<PublicUser>(
                            '/account',
                            send('PUT', {
                              name: user.name,
                              addresses: user.addresses.filter((_, n) => i !== n),
                            }),
                          );
                          await login(u);
                          toast('Address removed.');
                        } catch (e) {
                          toast((e as Error).message);
                        }
                      }}
                    >
                      Remove address
                    </button>
                  </div>
                ))
              ) : (
                <div className="panel">
                  <p>No addresses saved yet. You can save an address during checkout.</p>
                </div>
              )}
            </>
          ) : (
            <form
              className="panel profile-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const f = new FormData(e.currentTarget);
                  const u = await api<PublicUser>(
                    '/account',
                    send('PUT', { name: f.get('name'), addresses: user.addresses }),
                  );
                  await login(u);
                  toast('Profile updated.');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>Your details</h2>
              <label>
                Full name
                <input name="name" defaultValue={user.name} minLength={2} required />
              </label>
              <label>
                Email address
                <input value={user.email} disabled />
              </label>
              <p className="small-note">
                Contact rider support if you need to change your email address.
              </p>
              <button disabled={busy} className="button">
                Save changes <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
