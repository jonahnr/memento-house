-- Existing maps become locked Wedding maps. New maps must choose and lock a type during setup.
alter table public.weddings add column if not exists map_type text;
alter table public.weddings add column if not exists map_type_locked boolean not null default false;
alter table public.weddings add column if not exists map_subtype text;
alter table public.weddings add column if not exists event_metadata jsonb not null default '{}'::jsonb;

update public.weddings set map_type='wedding',map_type_locked=true where map_type is null;
alter table public.weddings alter column map_type set default 'wedding';
alter table public.weddings alter column map_type set not null;
alter table public.weddings drop constraint if exists weddings_map_type_check;
alter table public.weddings add constraint weddings_map_type_check check(map_type in('wedding','family_reunion','celebration_of_life','next_chapter','events_community'));
create index if not exists weddings_map_type_idx on public.weddings(map_type);
notify pgrst,'reload schema';
