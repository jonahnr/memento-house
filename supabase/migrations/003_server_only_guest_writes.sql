-- Guest writes are validated by /api/contribution and /api/like. Run this migration
-- after deploying the server routes to prevent bypassing validation with the anon key.
drop policy if exists "public destination insert" on public.destinations;
drop policy if exists "public recommendations insert" on public.recommendations;
drop policy if exists "public likes insert" on public.destination_likes;
revoke insert on public.destinations,public.recommendations,public.destination_likes from anon;
