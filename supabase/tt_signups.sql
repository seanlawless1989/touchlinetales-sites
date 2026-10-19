-- Touchline Tales home page sign-ups. Lives in Sean's nayfc-u9s Supabase project.
-- Visitors can add a row but can't read any back; Sean reads them in the Supabase dashboard.
create table if not exists public.tt_signups(
  id uuid primary key default gen_random_uuid(),
  created timestamptz not null default now(),
  name text not null check (length(name) between 1 and 200),
  email text not null check (length(email) between 3 and 320 and email like '%@%'),
  phone text default '' check (length(phone) <= 50),
  club text not null check (length(club) between 1 and 200),
  team text not null check (length(team) between 1 and 200),
  role text default '' check (length(role) <= 100),
  age_group text default '' check (length(age_group) <= 50),
  format text default '' check (length(format) <= 20),
  message text default '' check (length(message) <= 4000),
  status text not null default 'new' check (status in ('new','contacted','done'))
);
alter table public.tt_signups enable row level security;
drop policy if exists "anyone can sign up" on public.tt_signups;
create policy "anyone can sign up" on public.tt_signups for insert to anon, authenticated with check (status = 'new');
revoke all on public.tt_signups from anon, authenticated;
grant insert on public.tt_signups to anon, authenticated;
