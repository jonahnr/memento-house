-- Canonical commerce linkage, webhook idempotency, questionnaires, entitlements and fulfillment.
alter table public.orders add column if not exists external_reference text;
alter table public.orders add column if not exists catalog_key text;
alter table public.orders add column if not exists order_status text not null default 'payment_pending';
alter table public.orders add column if not exists fulfillment_workflow text;
alter table public.orders add column if not exists customization_id uuid;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists questionnaire_started_at timestamptz;
alter table public.orders add column if not exists proof_ready_at timestamptz;
alter table public.orders add column if not exists approved_at timestamptz;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists fulfilled_at timestamptz;
alter table public.orders drop constraint if exists orders_order_status_check;
alter table public.orders add constraint orders_order_status_check check(order_status in ('payment_pending','paid','questionnaire_pending','questionnaire_in_progress','design_pending','proof_ready','revision_requested','approved','in_production','shipped','fulfilled','account_ready','active','cancelled','refunded'));
do $$ begin alter table public.orders add constraint orders_external_reference_key unique(external_reference); exception when duplicate_object then null; end $$;
create unique index if not exists orders_payment_intent_uidx on public.orders(stripe_payment_intent_id) where stripe_payment_intent_id is not null and stripe_payment_intent_id<>'';
create index if not exists orders_customer_user_idx on public.orders(customer_user_id,created_at desc);

create table if not exists public.checkout_customizations(
 id uuid primary key default gen_random_uuid(), product text not null, tier text not null,
 payload jsonb not null default '{}', customer_user_id uuid, claimed_order_id uuid references public.orders(id),
 expires_at timestamptz not null default now()+interval '30 days', created_at timestamptz not null default now()
);
create table if not exists public.stripe_events(
 event_id text primary key, event_type text not null, status text not null default 'processing' check(status in ('processing','processed','failed')),
 attempts integer not null default 1, error_message text, processed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.entitlements(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 user_id uuid not null, entitlement text not null, status text not null default 'active' check(status in ('active','suspended','revoked','expired')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(order_id,entitlement)
);
create index if not exists entitlements_user_idx on public.entitlements(user_id,status);
create table if not exists public.questionnaires(
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade,
 user_id uuid not null, questionnaire_type text not null, schema_version integer not null default 1,
 status text not null default 'not_started' check(status in ('not_started','in_progress','submitted','reviewed')),
 answers jsonb not null default '{}', started_at timestamptz, submitted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.fulfillment_jobs(
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade,
 workflow text not null check(workflow in ('digital_map','custom_print')), status text not null,
 payload jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.order_events(
 id bigint generated always as identity primary key, order_id uuid not null references public.orders(id) on delete cascade,
 event_type text not null, from_status text, to_status text, actor_type text not null,
 actor_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events(order_id,created_at desc);
do $$ begin
 alter table public.checkout_customizations add constraint checkout_customizations_claimed_order_fk foreign key(claimed_order_id) references public.orders(id);
exception when duplicate_object then null; end $$;
do $$ begin
 alter table public.orders add constraint orders_customization_fk foreign key(customization_id) references public.checkout_customizations(id) not valid;
exception when duplicate_object then null; end $$;

alter table public.checkout_customizations enable row level security;
alter table public.stripe_events enable row level security;
alter table public.entitlements enable row level security;
alter table public.questionnaires enable row level security;
alter table public.fulfillment_jobs enable row level security;
alter table public.order_events enable row level security;
revoke all on public.checkout_customizations,public.stripe_events,public.entitlements,public.questionnaires,public.fulfillment_jobs,public.order_events from anon,authenticated;
grant select,update on public.questionnaires to authenticated;
create policy "customers read own questionnaire" on public.questionnaires for select to authenticated using(user_id=auth.uid());
create policy "customers update own questionnaire" on public.questionnaires for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select on public.entitlements to authenticated;
create policy "customers read own entitlements" on public.entitlements for select to authenticated using(user_id=auth.uid());

-- Reordering is committed atomically and produces a unique sequential rank per wedding.
create unique index if not exists couple_destination_priority_uidx on public.couple_destination_status(wedding_id,priority_rank) where priority_rank is not null;
create or replace function public.reorder_couple_destinations(p_wedding_id uuid,p_destination_ids uuid[]) returns void
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_rank integer:=1;
begin
 if not exists(select 1 from public.weddings where id=p_wedding_id and owner_user_id=auth.uid()) then raise exception 'forbidden'; end if;
 if exists(select 1 from unnest(p_destination_ids) x where not exists(select 1 from public.couple_destination_status s where s.wedding_id=p_wedding_id and s.destination_id=x)) then raise exception 'invalid destination'; end if;
 update public.couple_destination_status set priority_rank=null where wedding_id=p_wedding_id;
 foreach v_id in array p_destination_ids loop update public.couple_destination_status set priority_rank=v_rank,updated_at=now() where wedding_id=p_wedding_id and destination_id=v_id;v_rank:=v_rank+1;end loop;
end $$;
revoke all on function public.reorder_couple_destinations(uuid,uuid[]) from public,anon;
grant execute on function public.reorder_couple_destinations(uuid,uuid[]) to authenticated;
