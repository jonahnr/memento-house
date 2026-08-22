# Memento Map

A mobile-first wedding keepsake by Memento House. Guests recommend future adventures without creating accounts; couples preserve who suggested every place, moderate submissions, track visits, and print a keepsake.

## Included

- Premium landing page and public demo at `/map/jonah-kate`
- Fast in-page recommendation flow, duplicate voting behavior, likes, filters, sorting, and story pins
- Couple dashboard with overview, story, moderation, map, QR, keepsake, and settings views
- Post-wedding planning/visited statuses and print styles
- Multi-tenant PostgreSQL schema with Supabase row-level security
- Responsive, accessible layouts and realistic demo data

## Local setup

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add your service credentials.
4. Run the SQL in `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor.
5. Create an owner in Supabase Auth, replace `OWNER_UUID` in `supabase/seed.sql`, then run it.
6. Run `npm run dev` and open `http://localhost:3000`.

## Account access

Public visitors and wedding guests do not need an account. Couple account creation is gated by the Memento House access code `forevermemento`; enter it on `/signup` before creating an email/password account. Existing couples sign in normally at `/login`.

The checked-in experience uses polished local demo data when credentials are absent, so it can be reviewed immediately. To make writes durable, connect the form handlers to Supabase using the documented public insert policies; validate on the server and rate-limit guest endpoints before a public launch.

## Supabase

Create a Supabase project, enable email/password authentication, and add the Site URL plus `http://localhost:3000` as allowed redirect URLs. The migration creates tenant-scoped tables for weddings, story locations, normalized destinations, recommendations, anonymous destination likes, and couple status. Owner mutations are protected by `auth.uid()`; public access is limited to active content and validated inserts. Keep the service-role key server-only.

## Mapbox

Create a public token with Styles and Search access. Add it as `NEXT_PUBLIC_MAPBOX_TOKEN`. For production, replace the built-in illustrated fallback map with Mapbox GL and call the Search Box API from `LocationAutocomplete`; persist `mapbox_id`, formatted name, latitude, and longitude. The fallback deliberately keeps the demo usable without a token.

## Deploying

For Vercel, import the repository, add every value from `.env.example`, and deploy. Set `NEXT_PUBLIC_SITE_URL` to the production origin. Run the Supabase migration before inviting guests. This repository also contains `.openai/hosting.json` for a Codex Sites preview.

## Production checklist

- Configure Supabase email templates and redirects
- Add server-side Zod validation and rate limiting to guest mutations
- Configure Mapbox token URL restrictions
- Add CAPTCHA if public abuse appears
- Verify RLS with anonymous and authenticated test users
- Configure image storage policies before enabling uploads
