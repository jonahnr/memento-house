# End-to-end acceptance testing

The Playwright suite exercises the real browser, deployed API routes, Supabase persistence, fulfillment transitions, email outcomes, proof storage, refunds, guest publishing, and rate limits.

Use a Vercel preview deployment connected to a disposable Supabase project. Never point the stateful suite at production because it creates orders and guest content.

Required environment variables:

- `E2E_BASE_URL`: preview deployment URL
- `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`: payment-tester/admin account
- `E2E_WEDDING_ID`: active disposable Timeline Plus wedding UUID

Run `npm run test:e2e` for the entire acceptance suite. Run `npm run test:e2e:public` for the non-mutating same-origin location-search check. Refund coverage uses admin test orders; run a separate Stripe sandbox smoke test before payment changes to verify hosted Checkout and the `charge.refunded` webhook subscription.
