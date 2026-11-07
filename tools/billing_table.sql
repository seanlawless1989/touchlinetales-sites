-- Touchline Tales: record who has paid the £5 a month team plan (Stripe), next to the website sign-ups.
-- Run ONCE in the NAYFC Supabase project (elqwksyqwezhkekdqivn): SQL Editor > New query > paste > Run.
-- Needs tools/signups_table.sql first (it made public.tt_leads; already run on 3 Nov). Safe to run again.
-- Nobody can read or write this through the website: RLS on, no policies. Only the tt-billing function
-- (service role, called by Stripe's webhook) writes here.

create table if not exists public.tt_billing (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id bigint references public.tt_leads(id) on delete set null,
  email text,
  team text,                       -- what they typed as "Team name" on Stripe's page
  stripe_customer text,
  stripe_subscription text unique,
  status text not null default 'active', -- Stripe's subscription status: active, past_due, canceled, unpaid...
  live boolean not null default false,   -- false = a test-mode payment
  last_paid_at timestamptz,
  cancelled_at timestamptz,
  seen boolean not null default false    -- the hourly sign-up check reports unseen changes, then ticks this
);
alter table public.tt_billing enable row level security;
revoke all on public.tt_billing from anon, authenticated;

-- One line per sign-up showing whether it has paid
create or replace view public.tt_leads_paid as
  select l.id, l.created_at, l.form, l.data->>'Club or team' as club, l.data->>'Email' as email,
         b.status as plan, b.live, b.last_paid_at, b.team as stripe_team
  from public.tt_leads l left join public.tt_billing b on b.lead_id = l.id
  order by l.id desc;
revoke all on public.tt_leads_paid from anon, authenticated;

notify pgrst, 'reload schema';

-- Who's paying:      select * from public.tt_billing order by id desc;
-- Sign-ups + paid:   select * from public.tt_leads_paid;
