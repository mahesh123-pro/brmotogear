# BRMotoGear on Vercel

Deploy as two projects: `brmotogear` (Next.js) and `brmotogear-api` (Express). The browser calls the frontend's same-origin `/api/v1` proxy; authentication cookies stay on the storefront domain.

## Account and service prerequisites

Sign in with `npx vercel login`. Create MongoDB Atlas / a replica set and a Razorpay account. Begin with Razorpay **test** keys. Keep secrets in local `.env` or Vercel environment settings, never in chat or source control.

Backend production environment:

- `DEMO_MODE=false`
- `MONGODB_URI`
- `JWT_SECRET` (stable random secret, at least 32 characters)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `FRONTEND_URL` (the exact production frontend origin)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` for email OTP and order notifications

Live databases start empty. Demo users, orders and inventory are not uploaded.

## Prepare and verify

```powershell
node scripts/prepare-vercel-api.mjs
node --import tsx scripts/verify-vercel-api.mjs
npm run typecheck
npm run build
```

The generator copies only backend source and required shared types/seed definitions into `.vercel-api`. It excludes credentials and local data. The generated entry point initializes MongoDB once per function instance and runs reservation expiry on incoming requests, rather than relying on a server interval. Quotes and payment operations also validate reservation expiry.

## Publish

1. Link the frontend with `npx vercel link --project brmotogear` and the backend with `npx vercel link --cwd .vercel-api --project brmotogear-api`.
2. Configure backend environment variables through Vercel settings. Use the actual frontend production domain as `FRONTEND_URL`.
3. Deploy the backend with `npx vercel deploy --cwd .vercel-api --prod`. Verify `/api/v1/health` and `/api/v1/products` on its production URL.
4. Set `API_INTERNAL_URL` on the frontend to the backend production origin (no trailing slash). Set `NEXT_PUBLIC_SITE_URL` to the actual frontend production origin. Both must be available at build time and runtime.
5. Deploy the frontend with `npx vercel deploy --prod`.
6. Create your administrator using `npm run create-admin` with the same MongoDB URI and one-time administrator environment variables. Remove the bootstrap password afterward.
7. Configure Razorpay webhooks at the backend production `/api/v1/payments/webhook` URL. Verify test checkout, captured-payment verification, webhook delivery, refunds and SMTP before switching to live payment keys.

Do not point the deployed frontend at localhost. Do not enable JSON demo storage in production. Review database network access for Vercel's outbound connectivity. Keep preview deployment protection enabled; use authenticated Vercel access for preview checks.

No deployment URL is recorded until Vercel confirms a successful deployment.
