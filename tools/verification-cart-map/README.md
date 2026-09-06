# Cart and map update verification

Implemented all seven requested changes locally. No deployment or real payment was submitted.

- Nine sidebar icons were generated with the built-in image tool and compressed to 84 × 84 transparent WebP assets in `public/brand/navigation`. Total: 33,386 bytes. Exact prompts and original source paths: `../navigation-icons.json`.
- The QR image embeds the existing Memento House logo. The Timeline Plus invitation includes adding memories.
- Both print presets generate one US Letter page (612 × 792 PDF points). The two-card version contains two 8 × 5.25 inch landscape cards within quarter-inch page margins.
- The cart is available after sign-in, persists per user in this browser, preserves each saved design, and recalculates prices server-side. A single Stripe Checkout creates separate orders for each item. Paid line items are matched by identity, not response order; retries preserve fulfillment progress and refunds are limited to the selected order amount.
- Guest story marker numbers remain stable when selection changes. Bucket-list cards use the same gold styling across all travel statuses.
- The dashboard email has no background, border, shadow, or attached sign-out button.

Validation: production build, TypeScript, lint (no errors), 31 unit/regression tests, local browser checks using intercepted test account/map responses, and QR decoding at 960, 408, 259, 210, and 130 pixels. Live Stripe payment and production fulfillment were not exercised. Browser fixtures do not create real users or orders.

Screenshots and one-page print PDFs in this folder are verification fixtures, not customer data.

## Reference redesign and wedding chapter follow-up

Both QR layouts now use the supplied reference's prominent house logo, serif heading, gold dividers, and faint watermark. A dedicated signed-in cart shortcut uses a generated 2,998-byte WebP icon; its source prompt is in `../cart-icon.json`.

The wedding venue is projected into Timeline Plus automatically, with the current Event Details date and the photo/caption saved through Our Story. No duplicate venue record is created. A dated wedding also appears before its location is entered. The wedding is included in timeline exports and the shared story page.

34 regression tests pass. Browser verification includes editing the wedding, uploading a fixture photo, saving, checking Timeline Plus, and reloading Our Story. Both PDF outputs remain one letter-size page. All account, venue, and upload requests in the browser verification are intercepted fixtures.

## Regular map and clean QR correction

The regular guest map now uses the same wedding story projection as Timeline Plus, including its saved coordinates, caption, and photo. Verified with a Map Plus fixture that has Timeline Plus disabled. Story rows share the same markup, and their text columns align when no photo is present. Map keepsake story layers also include the wedding.

The QR matrix is now clean: no embedded logo and no central blank patch. The large logo above the QR remains. Pixel comparison against a fresh QR generation and decoding at five sizes pass. Both print PDFs contain one page; the production build, lint, and all 35 regression tests pass.
