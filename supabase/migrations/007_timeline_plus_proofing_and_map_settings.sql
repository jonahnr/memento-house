-- Timeline Plus, persisted keepsake framing, and versioned proof fulfillment.
alter table public.weddings add column if not exists keepsake_settings jsonb not null default '{"layers":["origins","recommendations"],"theme":"ivory","view":"world","style":"atlas","manual":{"zoom":1.4,"horizontal":0,"vertical":0},"countryPanels":[]}'::jsonb;

alter table public.orders drop constraint if exists orders_order_status_check;
alter table public.orders add constraint orders_order_status_check check(order_status in (
 'payment_pending','paid','awaiting_customer_information','ready_for_design','design_in_progress',
 'proof_ready','awaiting_customer_approval','changes_requested','approved','in_production',
 'ready_to_ship','shipped','delivered','completed','cancelled','refunded',
 'questionnaire_pending','questionnaire_in_progress','design_pending','revision_requested','fulfilled',
 'account_ready','active'
));

create table if not exists public.order_proofs(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 version integer not null, storage_path text not null, file_name text not null, mime_type text not null,
 message text not null default '', status text not null default 'draft' check(status in ('draft','sent','viewed','approved','changes_requested','superseded')),
 customer_feedback text, created_by uuid, sent_at timestamptz, viewed_at timestamptz, responded_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(order_id,version)
);
create index if not exists order_proofs_order_idx on public.order_proofs(order_id,version desc);

create table if not exists public.timeline_entries(
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade,
 destination_id uuid references public.destinations(id), recommendation_id uuid references public.recommendations(id),
 date_value date, date_precision text not null default 'exact' check(date_precision in ('exact','month','year','season','unknown')),
 approximate_date_label text, sort_date date not null, title text not null, category text not null,
 story text not null default '', contributor_name text not null default '', visibility text not null default 'private' check(visibility in ('private','link','public')),
 status text not null default 'published' check(status in ('pending','published','rejected','private')),
 planned_from_id uuid references public.timeline_entries(id), actual_visit_date date,
 created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists timeline_entries_wedding_sort_idx on public.timeline_entries(wedding_id,sort_date,id);
create index if not exists timeline_entries_wedding_status_idx on public.timeline_entries(wedding_id,status);

create table if not exists public.timeline_photos(
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.timeline_entries(id) on delete cascade,
 storage_path text not null, public_url text, alt_text text not null default '', width integer, height integer,
 created_at timestamptz not null default now()
);
create index if not exists timeline_photos_entry_idx on public.timeline_photos(entry_id);

create table if not exists public.timeline_shares(
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade,
 token_hash text not null unique, access text not null check(access in ('link','public')), active boolean not null default true,
 created_at timestamptz not null default now(), expires_at timestamptz
);

alter table public.order_proofs enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.timeline_photos enable row level security;
alter table public.timeline_shares enable row level security;

revoke all on public.order_proofs,public.timeline_shares from anon,authenticated;
grant select,update on public.order_proofs to authenticated;
grant select,insert,update,delete on public.timeline_entries,public.timeline_photos to authenticated;

create policy "customers read own proofs" on public.order_proofs for select to authenticated using(
 exists(select 1 from public.orders o where o.id=order_id and o.customer_user_id=auth.uid())
);
create policy "customers respond to own proofs" on public.order_proofs for update to authenticated using(
 exists(select 1 from public.orders o where o.id=order_id and o.customer_user_id=auth.uid())
) with check(exists(select 1 from public.orders o where o.id=order_id and o.customer_user_id=auth.uid()));

create policy "owners manage timeline" on public.timeline_entries for all to authenticated using(
 exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid())
) with check(exists(select 1 from public.weddings w where w.id=wedding_id and w.owner_user_id=auth.uid()));
create policy "approved timeline sharing" on public.timeline_entries for select using(status='published' and visibility='public');
create policy "owners manage timeline photos" on public.timeline_photos for all to authenticated using(
 exists(select 1 from public.timeline_entries e join public.weddings w on w.id=e.wedding_id where e.id=entry_id and w.owner_user_id=auth.uid())
) with check(exists(select 1 from public.timeline_entries e join public.weddings w on w.id=e.wedding_id where e.id=entry_id and w.owner_user_id=auth.uid()));

-- Existing orders without a questionnaire begin at their first real fulfillment step.
update public.orders o set questionnaire_status='not_required', order_status='ready_for_design', updated_at=now()
where coalesce(o.questionnaire_status,'') in ('','not_started') and not exists(select 1 from public.questionnaires q where q.order_id=o.id)
  and o.fulfillment_workflow='custom_print' and o.order_status in ('questionnaire_pending','design_pending');

insert into public.order_events(order_id,event_type,from_status,to_status,actor_type,metadata)
select o.id,'workflow_normalized',o.order_status,'ready_for_design','migration','{"migration":"007"}'::jsonb
from public.orders o where o.fulfillment_workflow='custom_print' and o.questionnaire_status='not_required'
on conflict do nothing;

notify pgrst,'reload schema';
