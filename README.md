# BRMotoGear

A responsive motorcycle-helmet storefront with a Next.js / React / TypeScript frontend, Express API, MongoDB persistence, Razorpay checkout, and a working admin workspace.

## Run locally

Requires Node.js 24 and npm.

```powershell
npm install
npm run dev
```

Open **http://localhost:3000**. The API runs at **http://127.0.0.1:5000** and is proxied through `/api/v1` by Next.js.

Without live configuration, development uses an explicitly labelled demo with persistent data in `data/demo.json`. No money is charged and no parcel is shipped. Register a new rider account, or open **My account → Rider account / Admin account** to explore the shared demo accounts. Demo admin access is never available in live mode. Do not enter real personal information into shared demo accounts.

The store stays usable after a restart: carts, wishlists, accounts, orders, reviews, coupons, messages and inventory persist. Demo access tokens rotate on restart; the persistent refresh session restores sign-in.

## Implemented journeys

- Homepage, collections, helmet catalog and product details, image galleries, fullscreen images, quick view, size/colour selection and stock feedback.
- Cinematic full-width mountain-road homepage with slow photographic pan/zoom, pause/play, offscreen/background-tab pausing and reduced-motion support. No 3D viewer or WebGL dependency is loaded.
- Search by name, category, brand and colour, including `helmet under 5000`. Category, price, size, colour, brand, rating, certification and availability filters; price, newest, recommendation, discount and rating sorting.
- Guest bag and wishlist, account merge on sign-in, server-persisted authenticated carts and wishlists.
- Email/password registration and sign-in, rotating HTTP-only cookie sessions, email OTP sign-in, profile and saved addresses.
- Server-quoted discounts and shipping, address validation, inventory reservation, idempotent order creation, resumable checkout, payment verification and order history/timeline.
- Razorpay order creation, hosted checkout, server-side HMAC verification, captured-payment lookup, raw-body webhook validation and idempotent settlement. Expired reservations release automatically. Late captures enter payment review for a refund.
- Admin revenue/category reporting, product creation/editing/archiving, size-and-colour inventory, category management, order fulfilment, tracking references, refunds, customers, coupons, review moderation and support inbox.
- Reviews require a delivered purchase and admin approval. Optional customer-photo URLs are supported.
- Contact form, size guide, safety guidance, FAQ, shipping/returns, privacy and terms pages.
- Rider journal at `/blog` with three complete articles, an illustrated `/lookbook`, and a printable `/ride-checklist` with browser-saved packing progress. Homepage story cards and expanded navigation connect these pages.
- Responsive layouts, keyboard focus states, native accessible image/quick-view dialogs, reduced-motion support, local fonts, optimized images, route metadata, product JSON-LD, sitemap and robots rules.

## Live configuration

Copy `.env.example` to `.env`, then configure the API environment. Never commit secrets.

| Variable | Purpose |
| --- | --- |
| `DEMO_MODE=false` | Enables real persistence/payment mode; demo endpoints return 404. |
| `MONGODB_URI` | MongoDB Atlas or a MongoDB replica-set URI. Standalone servers cannot provide the required transactions. |
| `JWT_SECRET` | Random secret with at least 32 characters. Keep stable across API instances. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay account credentials. Start with test keys. |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured for the webhook endpoint. |
| `FRONTEND_URL` | Exact public frontend origin, e.g. `https://shop.example.com`, without a trailing slash. |
| `API_INTERNAL_URL` | API origin accessible to Next.js. Configure this for both the frontend build and runtime. |
| `NEXT_PUBLIC_SITE_URL` | Public storefront URL for metadata and canonical links. |
| `HOST`, `PORT` | API bind host/port. Use `HOST=0.0.0.0` on a hosted API service. |
| `TRUST_PROXY=1` | Enable only behind a trusted, single-hop reverse proxy for correct client-IP rate limits. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Email OTP and order notifications. Port 465 uses TLS; 587 uses STARTTLS. |

Live mode fails startup when required database, signing or payment credentials are missing. It never silently falls back to the demo. Demo mode cannot run under `NODE_ENV=production`.

### Create the administrator

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters), then run:

```powershell
npm run create-admin
```

Remove `ADMIN_PASSWORD` from the environment after creation. The command refuses to overwrite or elevate an existing account. All registration requests create customer accounts regardless of submitted role fields.

Live databases start with helmet categories and **no sample products or demo accounts**. Add your authorized inventory through the admin product editor. Prices are entered in rupees in the UI and stored as integer paise. Only enter verified specifications, certification information and correctly matched product images.

### Razorpay setup

1. Enable automatic payment capture in the Razorpay dashboard.
2. Register the API's public `/api/v1/payments/webhook` endpoint. Subscribe to `payment.captured` and `refund.processed`.
3. Configure the same webhook signing secret in `RAZORPAY_WEBHOOK_SECRET`.
4. Run real Razorpay **test-mode** successful, failed, cancelled, delayed and refunded transactions before using live keys.
5. Verify webhook delivery/retry behaviour from Razorpay to your deployed endpoint.

Checkout never accepts a client-supplied payment status or total. It verifies signatures against the stored provider order ID and checks the captured payment amount and currency. Refund requests use a stable `X-Refund-Idempotency` key. A cancellation or return does not automatically restock a helmet; inspect the item and adjust stock deliberately in Inventory.

Reference: [Razorpay integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [webhook validation](https://github.com/razorpay/markdown-docs/blob/master/webhooks/validate-test.md), [idempotent refunds](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md).

## Deployment

### One server / Docker

```powershell
npm run build
npm start
```

`npm start` runs both services with production mode. It requires live-mode configuration and HTTPS at the reverse proxy. The included Dockerfile packages both services and runs as a non-root user. Pass runtime secrets via the hosting platform; `.dockerignore` excludes `.env` files and local data. Build with the same public URL configuration used at runtime.

### Split frontend and backend

- **Next.js frontend:** Deploy to Vercel or another Node host, with `API_INTERNAL_URL` pointing to the public Express service. Keep the same-origin `/api/v1` proxy; the browser does not need a backend origin or Razorpay secret.
- **Express backend:** `render.yaml` provides a Render blueprint. Build: `npm ci`; start: `npm run start:api`; health: `/api/v1/health`. Configure all secrets in the hosting dashboard.
- **MongoDB:** Use Atlas / a replica set, set network access deliberately, and enable backups.

No public deployment has been created and no paid service has been provisioned.

## Verification

```powershell
npm run typecheck
npm test
npm run build
# With npm run dev running in another terminal:
npx playwright install chromium
npm run test:e2e
# Verify editorial routes, photos, mobile layouts and saved checklist behaviour:
node scripts/verify-editorial.mjs
node scripts/verify-motion.mjs
```

Tests cover server-calculated totals, coupon restrictions, duplicate line aggregation, overselling, reservation expiry, replayed payment IDs, signature tampering, account permissions, order ownership, cross-origin writes, token rotation/revocation, OTP replay, fulfilment transitions and MongoDB transaction/reconnect persistence. The Mongo test uses an isolated replica set in the project drive and cleans up its own temporary database. The first run may download a MongoDB test binary into `node_modules/.cache`.

Browser tests exercise a new rider purchase, administrator fulfilment, customer review and moderation, plus mobile navigation/filtering/support. Browser tests use the running demo and create clearly labelled test records. They do not make real payments.

The local checks do **not** certify live Razorpay credentials, SMTP delivery, public HTTPS, shipping-provider coverage, or production performance under load. Those require the configured deployment and business data.

## Data and architecture

- `app/`: Next.js routes, metadata, styling and error states.
- `components/`: storefront, product, checkout, account and admin interfaces.
- `lib/`: shared types, API client, demo catalog and server product lookup.
- `server/app.ts`: validated Express endpoints and authentication/payment integration.
- `server/commerce.ts`: deterministic quoting, reservation and settlement rules.
- `server/store.ts`: durable local demo adapter and transactional MongoDB adapter.
- `tests/`: commerce/API/database tests and Playwright journeys.

MongoDB uses separate collections with unique keys. A transaction-scoped commerce lock serializes mutations across instances to prevent write skew in stock and coupon limits. This is a correctness-first implementation for a small catalog: it reads collection snapshots during mutations. For a high-volume catalog, replace this adapter with targeted queries and per-entity atomic reservations while retaining the tested commerce invariants. The JSON demo is single-process only.

## Content and launch inputs

The eight demonstration products use actual AXOR product photography; sample prices and inventory are not a live catalog. Image source URLs are recorded in `public/images/sources.json`. Confirm permission/retailer authorization or replace the imagery before commercial publishing. Hero/lifestyle photography comes from Unsplash; see `ASSETS.md`. Fonts are self-hosted under their included OFL licences.

Before accepting live orders, replace demonstration policy text with your business’s legal identity, contact details, actual return window, refund timelines and shipping commitments. Confirm model-specific sizing and certification information. Shipping currently validates the Indian PIN-code format and applies the configured flat/free threshold; carrier serviceability and label generation are not integrated. Customers see manual order updates and tracking references supplied by administrators.

Later roadmap items from the PRD—WhatsApp/SMS notifications, carrier APIs, advanced analytics, recommendations, loyalty, referrals and gift cards—are not part of this first implementation. Google login is optional and not enabled. Email OTP is implemented; SMS OTP requires a separate provider.


