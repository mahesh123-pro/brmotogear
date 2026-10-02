export type Variant = { size: string; color: string; stock: number; reserved: number };
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  mrp: number;
  images: string[];
  description: string;
  variants: Variant[];
  specifications: Record<string, string>;
  features: string[];
  certification: string;
  active: boolean;
  featured: boolean;
  createdAt: string;
  source?: string;
  rating?: number;
  reviewCount?: number;
};
export type CartItem = { productId: string; size: string; color: string; quantity: number };
export type Address = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};
export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  addresses: Address[];
  wishlist: string[];
  cart: CartItem[];
  createdAt: string;
};
export type PublicUser = Omit<User, 'passwordHash'>;
export type OrderItem = CartItem & { name: string; price: number; image: string };
export type Order = {
  id: string;
  number: string;
  userId: string;
  items: OrderItem[];
  address: Address;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: string;
  status: string;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'refund_required';
  providerOrderId?: string;
  paymentId?: string;
  idempotencyKey: string;
  createdAt: string;
  expiresAt: string;
  reserved: boolean;
  tracking: string;
  timeline: { status: string; at: string }[];
  notificationSent?: boolean;
};
export type Coupon = {
  id: string;
  code: string;
  percent: number;
  minimum: number;
  maximum: number;
  expiresAt: string;
  limit: number;
  perUser: number;
  active: boolean;
  categories?: string[];
  productIds?: string[];
};
export type Review = {
  id: string;
  userId: string;
  productId: string;
  name: string;
  rating: number;
  text: string;
  image: string;
  approved: boolean;
  createdAt: string;
};
export type Session = { id: string; userId: string; hash: string; expiresAt: string };
export type Ticket = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  resolved: boolean;
};
export type Otp = { id: string; email: string; hash: string; expiresAt: string; attempts: number };
export type Category = { id: string; name: string; active: boolean };
export type State = {
  products: Product[];
  users: User[];
  orders: Order[];
  coupons: Coupon[];
  reviews: Review[];
  sessions: Session[];
  tickets: Ticket[];
  otps: Otp[];
  categories: Category[];
};
export const categories = [
  'Full Face',
  'Modular',
  'Open Face',
  'Half Face',
  'Off-Road',
  'Dual Sport',
];
export const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value / 100);
