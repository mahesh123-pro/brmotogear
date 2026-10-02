'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { api, send, ApiError } from '@/lib/api';
import type { Product, CartItem, PublicUser } from '@/lib/types';
type Config = {
  demo: boolean;
  payments: string;
  notifications: boolean;
  otp: boolean;
  categories: string[];
};
type Store = {
  products: Product[];
  config: Config | null;
  user: PublicUser | null;
  ready: boolean;
  error: string;
  cart: CartItem[];
  wishlist: string[];
  reload: () => Promise<void>;
  login: (user: PublicUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: PublicUser) => void;
  setCart: (items: CartItem[]) => void;
  add: (item: CartItem) => boolean;
  toggleWish: (id: string) => void;
  toast: (message: string) => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({
  children,
  initialProducts = [],
}: {
  children: ReactNode;
  initialProducts?: Product[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [config, setConfig] = useState<Config | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [cart, updateCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const toast = useCallback((message: string) => setNotice(message), []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const reload = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api<Product[]>('/products'), api<Config>('/config')]);
      setProducts(p);
      setConfig(c);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      await reload();
      let u: PublicUser | null = null;
      try {
        u = await api<PublicUser>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          try {
            await api('/auth/refresh', send('POST'));
            u = await api<PublicUser>('/auth/me');
          } catch {}
        }
      }
      if (!active) return;
      setUser(u);
      if (u) {
        updateCart(u.cart);
        setWishlist(u.wishlist);
      } else {
        try {
          const saved = JSON.parse(localStorage.getItem('brmoto-cart') || '[]');
          if (Array.isArray(saved))
            updateCart(
              saved
                .filter(
                  (i) =>
                    i &&
                    typeof i.productId === 'string' &&
                    typeof i.size === 'string' &&
                    typeof i.color === 'string' &&
                    Number.isInteger(i.quantity) &&
                    i.quantity > 0 &&
                    i.quantity <= 10,
                )
                .slice(0, 30),
            );
          const wishes = JSON.parse(localStorage.getItem('brmoto-wishlist') || '[]');
          if (Array.isArray(wishes))
            setWishlist(wishes.filter((i) => typeof i === 'string').slice(0, 100));
        } catch {}
      }
      setReady(true);
    }
    void load();
    return () => {
      active = false;
    };
  }, [reload]);
  const setCart = useCallback(
    (items: CartItem[]) => {
      updateCart(items);
      try {
        localStorage.setItem('brmoto-cart', JSON.stringify(items));
      } catch {}
      if (user)
        writes.current = writes.current
          .then(() => api('/cart', send('PUT', items)))
          .catch((e) => toast(e.message));
    },
    [user, toast],
  );
  const login = async (u: PublicUser) => {
    const merged = [...u.cart];
    for (const i of cart) {
      const match = merged.find(
        (x) => x.productId === i.productId && x.size === i.size && x.color === i.color,
      );
      if (match) match.quantity = Math.min(10, Math.max(match.quantity, i.quantity));
      else merged.push(i);
    }
    const wishes = [...new Set([...u.wishlist, ...wishlist])];
    await Promise.all([api('/cart', send('PUT', merged)), api('/wishlist', send('PUT', wishes))]);
    setUser(u);
    updateCart(merged);
    setWishlist(wishes);
  };
  const logout = async () => {
    await writes.current;
    await api('/auth/logout', send('POST'));
    setUser(null);
    updateCart([]);
    setWishlist([]);
    localStorage.removeItem('brmoto-cart');
    localStorage.removeItem('brmoto-wishlist');
    toast('You have been signed out.');
  };
  const add = (item: CartItem) => {
    const p = products.find((p) => p.id === item.productId);
    const stock = p?.variants.find((v) => v.size === item.size && v.color === item.color);
    const existing = cart.find(
      (i) => i.productId === item.productId && i.size === item.size && i.color === item.color,
    );
    const quantity = (existing?.quantity || 0) + item.quantity;
    if (!stock || quantity > stock.stock - stock.reserved || quantity > 10) {
      toast('That quantity is not available in this size.');
      return false;
    }
    setCart(
      existing ? cart.map((i) => (i === existing ? { ...i, quantity } : i)) : [...cart, item],
    );
    toast(`${p?.name} added to your bag.`);
    return true;
  };
  const toggleWish = (id: string) => {
    const next = wishlist.includes(id) ? wishlist.filter((i) => i !== id) : [...wishlist, id];
    setWishlist(next);
    try {
      localStorage.setItem('brmoto-wishlist', JSON.stringify(next));
    } catch {}
    if (user)
      writes.current = writes.current
        .then(() => api('/wishlist', send('PUT', next)))
        .catch((e) => toast(e.message));
  };
  return (
    <Context.Provider
      value={{
        products,
        config,
        user,
        ready,
        error,
        cart,
        wishlist,
        reload,
        login,
        logout,
        updateUser: setUser,
        setCart,
        add,
        toggleWish,
        toast,
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useStore = () => {
  const context = useContext(Context);
  if (!context) throw new Error('Missing StoreProvider');
  return context;
};
