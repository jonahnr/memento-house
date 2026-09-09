# Cloudflare Stream setup

Memento House keeps image uploads in the existing Supabase Storage bucket. New videos use Cloudflare Stream Direct Creator Uploads, so video bytes travel from the guest's browser to Cloudflare and never pass through Vercel or Supabase storage.

## Required configuration

1. Enable Cloudflare Stream for the Memento House Cloudflare account. This may create paid usage, so it must be done by the account owner.
2. Create an API token restricted to **Account / Stream / Edit** for only the Memento House account.
3. Add these server-only variables to Vercel Production and Preview:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_STREAM_API_TOKEN`
   - `CLOUDFLARE_STREAM_WEBHOOK_SECRET`
4. Apply `supabase/migrations/011_unified_media_and_stream_video.sql` to the connected Supabase project.
5. Create one Stream webhook for `https://mementohouse.com/api/media/video-webhook`, copy its signing secret into `CLOUDFLARE_STREAM_WEBHOOK_SECRET`, and add the Preview webhook URL while validating Preview.
6. Redeploy after the variables and migration are present.

The API token and webhook secret must never use a `NEXT_PUBLIC_` prefix. Browser uploads receive only a single-use TUS upload URL created by the server.

## Limits and lifecycle

- Each video is limited to 60 seconds and 500 MB.
- Each wedding may retain up to 20 videos and 600 total seconds.
- The database reserves quota under a wedding-scoped transaction lock before Cloudflare issues an upload URL.
- Failed and expired uploads release reserved seconds. Deleting a ready video restores both duration and count capacity.
- Cloudflare webhook signatures are checked before processing updates are accepted, and repeat ready events are idempotent.

## Release verification

On both Preview and Production, test a photo-only memory, video-only memory, and a memory containing both. Confirm upload progress, the processing state, lazy playback in the Timeline Plus map and public story, owner media usage, deletion, restored quota, and unchanged legacy photos.
