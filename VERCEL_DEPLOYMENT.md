# Vercel deployment

This branch migrates Memento House from the Vinext/Cloudflare Worker hosting shell to native Next.js on Vercel. Application routes, pages, styling, public assets, Supabase access, Stripe Checkout, webhook handling, Resend email, and the customization studios remain in the existing App Router application.

## Framework and build

- Framework preset: **Next.js** (auto-detected)
- Node.js: **22.x** (`package.json` requires Node 22.13 or newer)
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave blank; Vercel manages `.next`
- Root directory: repository root

Do not configure this repository as a generic Vite project. The production server routes require the Next.js runtime.

## Environment variables

Set these for Production, Preview, and Development as appropriate. Use separate Stripe test and live values; never expose server-only values with a `NEXT_PUBLIC_` prefix.

### Core application

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS` (comma-separated)
- `NEXT_PUBLIC_SITE_URL` (the Vercel deployment origin for Preview, then the custom production origin when cut over)

### Payments

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_TEST_SECRET_KEY`
- `STRIPE_TEST_WEBHOOK_SECRET`
- `STRIPE_PRICE_MAP_BASIC`
- `STRIPE_PRICE_MAP_PLUS`
- `STRIPE_PRICE_MAP_TIMELINE_PLUS`
- `STRIPE_PRICE_DECK_ESSENTIAL`
- `STRIPE_PRICE_DECK_SIGNATURE`
- `STRIPE_PRICE_DECK_STORY`
- `STRIPE_PRICE_DECK_BESPOKE`
- `STRIPE_PRICE_UNITY_STANDARD`
- `STRIPE_PRICE_UNITY_BESPOKE`

### Transactional email

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`

### Optional mapping token

- `NEXT_PUBLIC_MAPBOX_TOKEN` is retained for the planned Mapbox integration. The current illustrated map fallback does not require it.

## External service setup

1. Apply all numbered Supabase migrations through `006_commerce_fulfillment_architecture.sql` (and any later checked-in migration) before enabling commerce traffic.
2. In Supabase Auth, add the Vercel Preview URL used for acceptance testing and the eventual production origin to the allowed redirect URLs. Keep `http://localhost:3000` for local development.
3. Add a Stripe webhook endpoint for `https://<vercel-origin>/api/stripe-webhook`, subscribe to `checkout.session.completed`, and store that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`. Configure a separate test endpoint/signing secret when testing Stripe test mode.
4. Verify the Resend sending domain and make `RESEND_FROM_EMAIL` use that verified domain.
5. Confirm every Stripe Price ID belongs to the same Stripe mode as its secret key.
6. Deploy the branch to a Vercel Preview URL and complete authentication, checkout, webhook, upload, proof, and email acceptance tests before changing DNS.

## Runtime differences

- Environment variables are read directly from Vercel's Node.js runtime instead of being copied from Cloudflare Worker bindings.
- Next.js/Vercel handles image and route delivery; the Cloudflare `/_vinext/image` handler is no longer present.
- API route handlers run as Vercel Functions. Supabase Storage continues to hold customer uploads, so files do not rely on Vercel's ephemeral filesystem.
- Preview deployments have their own origin. Supabase redirect allowlists, Stripe webhook URLs, and `NEXT_PUBLIC_SITE_URL` must match the environment being tested.
