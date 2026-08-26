-- Customer accounts, auditable order archiving, shipping notifications, and Timeline Plus release pricing.
alter table public.orders add column if not exists archived_at timestamptz;
alter table public.orders add column if not exists archived_by uuid;
alter table public.orders add column if not exists shipping_carrier text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists shipping_notified_at timestamptz;

create index if not exists orders_customer_user_created_idx on public.orders(customer_user_id,created_at desc) where archived_at is null;
create index if not exists orders_active_status_idx on public.orders(order_status,created_at desc) where archived_at is null;

create table if not exists public.customer_notifications(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 customer_user_id uuid, recipient_email text not null, notification_type text not null,
 subject text not null, payload jsonb not null default '{}'::jsonb,
 status text not null default 'queued' check(status in ('queued','sent','failed','cancelled')),
 provider_message_id text, error_message text, sent_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists customer_notifications_queue_idx on public.customer_notifications(status,created_at) where status='queued';
alter table public.customer_notifications enable row level security;
revoke all on public.customer_notifications from anon,authenticated;

-- A general store account no longer creates a map automatically. Map fulfillment creates the wedding when appropriate.
create or replace function public.create_wedding_for_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare p1 text; p2 text; wd date; account_type text;
begin
 account_type:=coalesce(new.raw_user_meta_data->>'account_type','map');
 if account_type='customer' and coalesce(new.raw_user_meta_data->>'product_tier','') not in ('map','plus','timeline-plus') then return new; end if;
 p1:=coalesce(nullif(trim(new.raw_user_meta_data->>'partner_one_name'),''),split_part(coalesce(new.email,'Couple'),'@',1));
 p2:=coalesce(nullif(trim(new.raw_user_meta_data->>'partner_two_name'),''),'Partner');
 begin wd:=nullif(new.raw_user_meta_data->>'wedding_date','')::date; exception when others then wd:=null; end;
 insert into public.weddings(owner_user_id,partner_one_name,partner_two_name,wedding_date,slug)
 values(new.id,p1,p2,wd,public.make_wedding_slug(p1,p2,new.id)) on conflict(owner_user_id) do nothing;
 return new;
end $$;

-- Customer-facing order and proof access remains owner-scoped.
drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders for select to authenticated using(customer_user_id=auth.uid() and archived_at is null);
grant select on public.orders to authenticated;

-- Ensure short or blank couple notes do not collide with the guest recommendation constraint.
alter table public.couple_destination_status alter column couple_note drop not null;
