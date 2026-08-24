alter table public.recommendations drop constraint if exists recommendations_message_check;
alter table public.recommendations add constraint recommendations_message_check check (char_length(coalesce(message, '')) <= 1500);
alter table public.couple_destination_status add column if not exists priority_rank integer;
alter table public.couple_destination_status drop constraint if exists couple_destination_status_priority_rank_check;
alter table public.couple_destination_status add constraint couple_destination_status_priority_rank_check check (priority_rank is null or priority_rank between 1 and 999);
