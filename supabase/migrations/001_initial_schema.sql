create extension if not exists pgcrypto;

create table if not exists public.weddings (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null unique references auth.users(id) on delete cascade,
 partner_one_name text not null, partner_two_name text not null, wedding_date date, title text not null default 'Our Adventure Map',
 slug text not null unique check(slug ~ '^[a-z0-9-]+$'), welcome_message text not null default 'See where our story has taken us and help choose where we go next.',
 accent_color text not null default 'antique_gold', background_theme text not null default 'ivory', hero_image_url text,
 status text not null default 'active' check(status in ('draft','active','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.story_locations (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade,
 location_name text not null, latitude double precision not null, longitude double precision not null, mapbox_place_id text,
 story_type text not null, title text not null, description text not null, event_date date, image_url text,
 sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.destinations (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade,
 location_name text not null, normalized_location_name text not null, latitude double precision not null, longitude double precision not null,
 mapbox_place_id text, created_at timestamptz not null default now(), unique(wedding_id,normalized_location_name)
);
create table if not exists public.recommendations (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade,
 destination_id uuid not null references public.destinations(id) on delete cascade, guest_name text not null check(length(guest_name) between 1 and 100),
 message text not null check(length(message) between 5 and 1500), activity_recommendation text, food_recommendation text,
 best_time_to_visit text, suggested_trip_length text, category text,
 status text not null default 'active' check(status in ('active','hidden','deleted')), created_at timestamptz not null default now()
);
create table if not exists public.destination_likes (
 id uuid primary key default gen_random_uuid(), destination_id uuid not null references public.destinations(id) on delete cascade,
 anonymous_session_id text not null, created_at timestamptz not null default now(), unique(destination_id,anonymous_session_id)
);
create table if not exists public.couple_destination_status (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade,
 destination_id uuid not null references public.destinations(id) on delete cascade,
 status text not null default 'want_to_go' check(status in ('want_to_go','planning','visited')),
 planned_date date, visited_date date, couple_note text, image_url text, updated_at timestamptz not null default now(),
 unique(wedding_id,destination_id)
);
create index if not exists destinations_wedding_idx on public.destinations(wedding_id);
create index if not exists recommendations_destination_idx on public.recommendations(destination_id);
create index if not exists recommendations_wedding_idx on public.recommendations(wedding_id);
create index if not exists story_locations_wedding_idx on public.story_locations(wedding_id);

create or replace function public.make_wedding_slug(first_name text, second_name text, user_id uuid)
returns text language sql immutable set search_path='' as $$
 select trim(both '-' from regexp_replace(lower(coalesce(first_name,'couple')||'-'||coalesce(second_name,'wedding')),'[^a-z0-9]+','-','g'))||'-'||left(user_id::text,6)
$$;
create or replace function public.create_wedding_for_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare p1 text; p2 text; wd date;
begin
 p1:=coalesce(nullif(trim(new.raw_user_meta_data->>'partner_one_name'),''),split_part(coalesce(new.email,'Couple'),'@',1));
 p2:=coalesce(nullif(trim(new.raw_user_meta_data->>'partner_two_name'),''),'Partner');
 begin wd:=nullif(new.raw_user_meta_data->>'wedding_date','')::date; exception when others then wd:=null; end;
 insert into public.weddings(owner_user_id,partner_one_name,partner_two_name,wedding_date,slug)
 values(new.id,p1,p2,wd,public.make_wedding_slug(p1,p2,new.id)) on conflict(owner_user_id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of raw_user_meta_data on auth.users
for each row execute function public.create_wedding_for_user();
insert into public.weddings(owner_user_id,partner_one_name,partner_two_name,wedding_date,slug)
select u.id,
 coalesce(nullif(trim(u.raw_user_meta_data->>'partner_one_name'),''),split_part(coalesce(u.email,'Couple'),'@',1)),
 coalesce(nullif(trim(u.raw_user_meta_data->>'partner_two_name'),''),'Partner'),
 case when coalesce(u.raw_user_meta_data->>'wedding_date','') ~ '^\d{4}-\d{2}-\d{2}$' then (u.raw_user_meta_data->>'wedding_date')::date end,
 public.make_wedding_slug(u.raw_user_meta_data->>'partner_one_name',u.raw_user_meta_data->>'partner_two_name',u.id)
from auth.users u on conflict(owner_user_id) do nothing;

alter table public.weddings enable row level security;
alter table public.story_locations enable row level security;
alter table public.destinations enable row level security;
alter table public.recommendations enable row level security;
alter table public.destination_likes enable row level security;
alter table public.couple_destination_status enable row level security;

drop policy if exists "public active weddings" on public.weddings;
drop policy if exists "owners manage weddings" on public.weddings;
create policy "public active weddings" on public.weddings for select using(status='active' or owner_user_id=auth.uid());
create policy "owners manage weddings" on public.weddings for all to authenticated using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());
drop policy if exists "public story read" on public.story_locations;
drop policy if exists "owners manage story" on public.story_locations;
create policy "public story read" on public.story_locations for select using(exists(select 1 from public.weddings w where w.id=wedding_id and (w.status='active' or w.owner_user_id=auth.uid())));
create policy "owners manage story" on public.story_locations for all to authenticated using(exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid())) with check(exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid()));
drop policy if exists "public destinations read" on public.destinations;
drop policy if exists "public destination insert" on public.destinations;
drop policy if exists "owners manage destinations" on public.destinations;
create policy "public destinations read" on public.destinations for select using(exists(select 1 from public.weddings w where w.id=wedding_id and (w.status='active' or w.owner_user_id=auth.uid())));
create policy "public destination insert" on public.destinations for insert with check(exists(select 1 from public.weddings w where w.id=wedding_id and w.status='active'));
create policy "owners manage destinations" on public.destinations for all to authenticated using(exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid())) with check(exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid()));
drop policy if exists "public recommendations read" on public.recommendations;
drop policy if exists "public recommendations insert" on public.recommendations;
drop policy if exists "owners manage recommendations" on public.recommendations;
create policy "public recommendations read" on public.recommendations for select using(status='active' or exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid()));
create policy "public recommendations insert" on public.recommendations for insert with check(status='active' and exists(select 1 from public.weddings w where w.id=wedding_id and w.status='active'));
create policy "owners manage recommendations" on public.recommendations for all to authenticated using(exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid())) with check(exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid()));
drop policy if exists "public likes read" on public.destination_likes;
drop policy if exists "public likes insert" on public.destination_likes;
drop policy if exists "public likes remove own" on public.destination_likes;
create policy "public likes read" on public.destination_likes for select using(true);
create policy "public likes insert" on public.destination_likes for insert with check(length(anonymous_session_id) between 10 and 100);
create policy "public likes remove own" on public.destination_likes for delete using(anonymous_session_id=current_setting('request.headers',true)::json->>'x-anonymous-id');
drop policy if exists "public status read" on public.couple_destination_status;
drop policy if exists "owners manage status" on public.couple_destination_status;
create policy "public status read" on public.couple_destination_status for select using(exists(select 1 from public.weddings w where w.id=wedding_id and (w.status='active' or w.owner_user_id=auth.uid())));
create policy "owners manage status" on public.couple_destination_status for all to authenticated using(exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid())) with check(exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid()));

grant usage on schema public to anon,authenticated;
grant select on public.weddings,public.story_locations,public.destinations,public.recommendations,public.destination_likes,public.couple_destination_status to anon,authenticated;
grant insert on public.destinations,public.recommendations,public.destination_likes to anon,authenticated;
grant insert,update,delete on public.weddings,public.story_locations,public.destinations,public.recommendations,public.couple_destination_status to authenticated;
