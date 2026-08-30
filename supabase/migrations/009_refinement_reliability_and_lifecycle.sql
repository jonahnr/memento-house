-- Additive production-hardening for proof history, contribution controls, and operations.
alter table public.weddings add column if not exists contribution_status text not null default 'open';
alter table public.weddings add column if not exists contribution_closes_at timestamptz;
alter table public.weddings drop constraint if exists weddings_contribution_status_check;
alter table public.weddings add constraint weddings_contribution_status_check
  check (contribution_status in ('open','paused','closed'));

alter table public.order_proofs add column if not exists original_storage_path text;
alter table public.order_proofs add column if not exists watermarked_storage_path text;
alter table public.order_proofs add column if not exists opened_at timestamptz;
alter table public.order_proofs add column if not exists decided_at timestamptz;
alter table public.order_proofs add column if not exists superseded_by_id uuid references public.order_proofs(id);

update public.order_proofs
set original_storage_path=coalesce(original_storage_path,storage_path),
    watermarked_storage_path=coalesce(watermarked_storage_path,storage_path),
    opened_at=coalesce(opened_at,viewed_at),
    decided_at=coalesce(decided_at,responded_at)
where original_storage_path is null or watermarked_storage_path is null
   or (opened_at is null and viewed_at is not null)
   or (decided_at is null and responded_at is not null);

alter table public.orders add column if not exists assigned_to text;
alter table public.orders add column if not exists due_at timestamptz;

create table if not exists public.customer_support_notes(
 id uuid primary key default gen_random_uuid(),
 customer_user_id uuid not null,
 author_user_id uuid,
 note text not null check(char_length(note) between 1 and 5000),
 created_at timestamptz not null default now()
);
create index if not exists customer_support_notes_customer_idx
 on public.customer_support_notes(customer_user_id,created_at desc);
alter table public.customer_support_notes enable row level security;
revoke all on public.customer_support_notes from anon,authenticated;

notify pgrst,'reload schema';
