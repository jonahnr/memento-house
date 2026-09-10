-- Each paid Memento Map is its own typed product instance. The physical
-- `weddings` table name remains for backwards compatibility with every child FK.
alter table public.weddings add column if not exists map_type text;
alter table public.weddings add column if not exists map_type_locked boolean not null default false;
alter table public.weddings add column if not exists map_subtype text;
alter table public.weddings add column if not exists event_metadata jsonb not null default '{}'::jsonb;
alter table public.weddings add column if not exists map_tier text;
alter table public.weddings add column if not exists source_order_id uuid;
alter table public.weddings add column if not exists configured_at timestamptz;

update public.weddings
set map_type='wedding', map_type_locked=true, configured_at=coalesce(configured_at,created_at)
where map_type is null;

-- Migration 012 may already have assigned the Wedding type. Any map that
-- existed before order linkage is an already-configured legacy Wedding map.
update public.weddings
set configured_at=coalesce(configured_at,created_at)
where source_order_id is null;

update public.weddings w
set map_tier=case
 when exists(select 1 from public.entitlements e where e.user_id=w.owner_user_id and e.status='active' and e.entitlement='map_timeline_plus') then 'timeline-plus'
 when exists(select 1 from public.entitlements e where e.user_id=w.owner_user_id and e.status='active' and e.entitlement='map_plus') then 'plus'
 else 'map'
end
where map_tier is null;

alter table public.weddings alter column map_type set default 'wedding';
alter table public.weddings alter column map_type set not null;
alter table public.weddings alter column map_tier set default 'map';
alter table public.weddings alter column map_tier set not null;
alter table public.weddings drop constraint if exists weddings_map_type_check;
alter table public.weddings add constraint weddings_map_type_check check(map_type in('wedding','family_reunion','celebration_of_life','next_chapter','events_community'));
alter table public.weddings drop constraint if exists weddings_map_tier_check;
alter table public.weddings add constraint weddings_map_tier_check check(map_tier in('map','plus','timeline-plus'));

-- Accounts can own several maps. Account creation no longer creates a map.
alter table public.weddings drop constraint if exists weddings_owner_user_id_key;
drop trigger if exists on_auth_user_created on auth.users;

alter table public.orders add column if not exists map_id uuid references public.weddings(id) on delete set null;
alter table public.entitlements add column if not exists map_id uuid references public.weddings(id) on delete cascade;
do $$ begin
 alter table public.weddings add constraint weddings_source_order_fk foreign key(source_order_id) references public.orders(id) on delete set null;
exception when duplicate_object then null; end $$;
create unique index if not exists weddings_source_order_uidx on public.weddings(source_order_id) where source_order_id is not null;
create index if not exists weddings_owner_created_idx on public.weddings(owner_user_id,created_at desc);
create index if not exists entitlements_map_idx on public.entitlements(map_id,status);

create table if not exists public.map_categories(
 id uuid primary key default gen_random_uuid(),
 map_id uuid not null references public.weddings(id) on delete cascade,
 semantic_key text not null,
 label text not null check(length(label) between 1 and 80),
 description text not null default '',
 category_kind text not null default 'place' check(category_kind in('origin','recommendation','memory','milestone','place','organization','future')),
 color text,
 sort_order integer not null default 0,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(map_id,semantic_key)
);
create index if not exists map_categories_map_idx on public.map_categories(map_id,sort_order);
alter table public.map_categories enable row level security;
drop policy if exists "public active map categories" on public.map_categories;
drop policy if exists "owners manage map categories" on public.map_categories;
create policy "public active map categories" on public.map_categories for select using(exists(select 1 from public.weddings w where w.id=map_id and (w.status='active' or w.owner_user_id=auth.uid())));
create policy "owners manage map categories" on public.map_categories for all to authenticated using(exists(select 1 from public.weddings w where w.id=map_id and w.owner_user_id=auth.uid())) with check(exists(select 1 from public.weddings w where w.id=map_id and w.owner_user_id=auth.uid()));
grant select on public.map_categories to anon,authenticated;
grant insert,update,delete on public.map_categories to authenticated;

create or replace function public.provision_paid_memento_map(
 p_order_id uuid,
 p_owner_user_id uuid,
 p_map_type text,
 p_map_tier text,
 p_categories jsonb
) returns public.weddings
language plpgsql security definer set search_path=public
as $$
declare v_map public.weddings; v_category jsonb; v_name text; v_slug text;
begin
 if p_map_type not in ('wedding','family_reunion','celebration_of_life','next_chapter','events_community') then raise exception 'invalid map type'; end if;
 if p_map_tier not in ('map','plus','timeline-plus') then raise exception 'invalid map tier'; end if;
 if not exists(select 1 from public.orders where id=p_order_id and customer_user_id=p_owner_user_id and product='map' and payment_status in('paid','test_paid','admin_bypass')) then raise exception 'paid map order not found'; end if;

 perform pg_advisory_xact_lock(hashtextextended(p_order_id::text,0));
 select * into v_map from public.weddings where source_order_id=p_order_id;
 if v_map.id is null then
  v_name:=case p_map_type when 'wedding' then 'Your Wedding' when 'family_reunion' then 'Your Family Reunion' when 'celebration_of_life' then 'A Life Remembered' when 'next_chapter' then 'Your Next Chapter' else 'Your Community' end;
  v_slug:=replace(p_map_type,'_','-')||'-'||left(gen_random_uuid()::text,8);
  insert into public.weddings(owner_user_id,partner_one_name,partner_two_name,title,slug,map_type,map_type_locked,map_tier,source_order_id,event_metadata)
  values(p_owner_user_id,v_name,case when p_map_type='wedding' then 'Partner' else '' end,v_name,v_slug,p_map_type,true,p_map_tier,p_order_id,'{}'::jsonb)
  returning * into v_map;
 end if;

 update public.orders set map_id=v_map.id,updated_at=now() where id=p_order_id;
 update public.entitlements set map_id=v_map.id,updated_at=now() where order_id=p_order_id;
 if jsonb_typeof(p_categories)='array' then
  for v_category in select value from jsonb_array_elements(p_categories) loop
   insert into public.map_categories(map_id,semantic_key,label,description,category_kind,color,sort_order)
   values(v_map.id,v_category->>'key',v_category->>'label',coalesce(v_category->>'description',''),coalesce(v_category->>'kind','place'),v_category->>'color',coalesce((v_category->>'sortOrder')::integer,0))
   on conflict(map_id,semantic_key) do nothing;
  end loop;
 end if;
 return v_map;
end $$;
revoke all on function public.provision_paid_memento_map(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.provision_paid_memento_map(uuid,uuid,text,text,jsonb) to service_role;

notify pgrst,'reload schema';
