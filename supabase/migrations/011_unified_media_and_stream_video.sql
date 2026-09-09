-- Additive unified media metadata and concurrency-safe profile video reservations.
create table if not exists public.media_assets(
 id uuid primary key default gen_random_uuid(),
 wedding_id uuid not null references public.weddings(id) on delete cascade,
 media_type text not null check(media_type in ('photo','video')),
 storage_provider text not null check(storage_provider in ('supabase','cloudflare_stream')),
 status text not null default 'reserved' check(status in ('reserved','uploading','processing','ready','failed','expired','deleted')),
 timeline_entry_id uuid references public.timeline_entries(id) on delete cascade,
 story_location_id uuid references public.story_locations(id) on delete cascade,
 destination_id uuid references public.destinations(id) on delete cascade,
 storage_path text, public_url text, alt_text text not null default '',
 cloudflare_uid text unique, playback_url text, thumbnail_url text,
 file_name text, mime_type text, file_size_bytes bigint,
 duration_seconds numeric(8,3), reserved_seconds integer not null default 0,
 uploader_kind text not null default 'guest' check(uploader_kind in ('guest','owner')),
 uploader_user_id uuid, actor_hash text, error_message text,
 expires_at timestamptz, deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(media_type='video' or reserved_seconds=0),
 check(file_size_bytes is null or file_size_bytes>=0),
 check(duration_seconds is null or duration_seconds>=0)
);
create index if not exists media_assets_wedding_status_idx on public.media_assets(wedding_id,status,created_at desc);
create index if not exists media_assets_timeline_idx on public.media_assets(timeline_entry_id) where timeline_entry_id is not null;
create index if not exists media_assets_story_idx on public.media_assets(story_location_id) where story_location_id is not null;
create index if not exists media_assets_destination_idx on public.media_assets(destination_id) where destination_id is not null;

alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon,authenticated;
grant select(id,wedding_id,media_type,status,public_url,playback_url,thumbnail_url,cloudflare_uid,alt_text,duration_seconds,timeline_entry_id,story_location_id,destination_id,error_message,created_at,deleted_at) on public.media_assets to anon,authenticated;
create policy "shared ready media read" on public.media_assets for select using(
 status='ready' and deleted_at is null and exists(
  select 1 from public.weddings w where w.id=wedding_id and w.status='active'
 ) and (
  exists(select 1 from public.timeline_entries e where e.id=timeline_entry_id and e.status='published' and e.visibility in ('public','link'))
  or exists(select 1 from public.story_locations s where s.id=story_location_id)
  or exists(select 1 from public.destinations d where d.id=destination_id)
 )
);
create policy "owners read all media" on public.media_assets for select to authenticated using(
 exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid())
);

create or replace function public.reserve_video_upload(
 p_wedding_id uuid,p_media_id uuid,p_actor_hash text,p_uploader_kind text,p_uploader_user_id uuid,
 p_file_name text,p_mime_type text,p_file_size_bytes bigint,p_max_total_seconds integer,
 p_max_video_count integer,p_max_individual_seconds integer,p_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public as $$
declare used_seconds numeric; held_seconds numeric; active_count integer; remaining integer; reservation integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_wedding_id::text||':video-quota',0));
 update public.media_assets set status='expired',reserved_seconds=0,updated_at=now()
  where wedding_id=p_wedding_id and status in ('reserved','uploading','processing') and expires_at<now();
 select coalesce(sum(duration_seconds),0) into used_seconds from public.media_assets
  where wedding_id=p_wedding_id and media_type='video' and status='ready' and deleted_at is null;
 select coalesce(sum(reserved_seconds),0) into held_seconds from public.media_assets
  where wedding_id=p_wedding_id and media_type='video' and status in ('reserved','uploading','processing') and deleted_at is null;
 select count(*) into active_count from public.media_assets
  where wedding_id=p_wedding_id and media_type='video' and status in ('reserved','uploading','processing','ready') and deleted_at is null;
 remaining:=greatest(0,p_max_total_seconds-ceil(used_seconds+held_seconds)::integer);
 if remaining<1 or active_count>=p_max_video_count then
  return jsonb_build_object('ok',false,'remainingSeconds',remaining,'usedSeconds',ceil(used_seconds)::integer,'videoCount',active_count);
 end if;
 reservation:=least(p_max_individual_seconds,remaining);
 insert into public.media_assets(id,wedding_id,media_type,storage_provider,status,reserved_seconds,uploader_kind,uploader_user_id,actor_hash,file_name,mime_type,file_size_bytes,expires_at)
 values(p_media_id,p_wedding_id,'video','cloudflare_stream','reserved',reservation,p_uploader_kind,p_uploader_user_id,p_actor_hash,p_file_name,p_mime_type,p_file_size_bytes,p_expires_at);
 return jsonb_build_object('ok',true,'reservationSeconds',reservation,'remainingSeconds',remaining-reservation,'usedSeconds',ceil(used_seconds)::integer,'videoCount',active_count+1);
end $$;

create or replace function public.release_video_reservation(p_media_id uuid,p_error text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.media_assets set status=case when p_error is null then 'expired' else 'failed' end,reserved_seconds=0,error_message=p_error,updated_at=now()
 where id=p_media_id and status in ('reserved','uploading','processing');
end $$;

create or replace function public.finalize_stream_video(
 p_cloudflare_uid text,p_state text,p_duration_seconds numeric,p_playback_url text,p_thumbnail_url text,p_error text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare asset public.media_assets%rowtype;
begin
 select * into asset from public.media_assets where cloudflare_uid=p_cloudflare_uid;
 if asset.id is null then return null; end if;
 perform pg_advisory_xact_lock(hashtextextended(asset.wedding_id::text||':video-quota',0));
 select * into asset from public.media_assets where id=asset.id for update;
 if asset.status in ('ready','deleted') then return asset.id; end if;
 if p_state='ready' and coalesce(p_duration_seconds,0)<=asset.reserved_seconds then
  update public.media_assets set status='ready',duration_seconds=p_duration_seconds,reserved_seconds=0,playback_url=p_playback_url,thumbnail_url=p_thumbnail_url,error_message=null,updated_at=now() where id=asset.id;
 elsif p_state='ready' then
  update public.media_assets set status='failed',reserved_seconds=0,error_message='Processed video exceeded its reserved duration.',updated_at=now() where id=asset.id;
 else
  update public.media_assets set status='failed',reserved_seconds=0,error_message=coalesce(p_error,'Cloudflare could not process this video.'),updated_at=now() where id=asset.id and status<>'deleted';
 end if;
 return asset.id;
end $$;

revoke all on function public.reserve_video_upload(uuid,uuid,text,text,uuid,text,text,bigint,integer,integer,integer,timestamptz) from public,anon,authenticated;
revoke all on function public.release_video_reservation(uuid,text) from public,anon,authenticated;
revoke all on function public.finalize_stream_video(text,text,numeric,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_video_upload(uuid,uuid,text,text,uuid,text,text,bigint,integer,integer,integer,timestamptz) to service_role;
grant execute on function public.release_video_reservation(uuid,text) to service_role;
grant execute on function public.finalize_stream_video(text,text,numeric,text,text,text) to service_role;
notify pgrst,'reload schema';
