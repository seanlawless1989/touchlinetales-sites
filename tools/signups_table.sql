-- Touchline Tales: save every website sign-up (home page + club join pages) in the database,
-- so none are lost when the email service fails.
-- Run ONCE in the NAYFC Supabase project (elqwksyqwezhkekdqivn): SQL Editor > New query > paste > Run.
-- Safe to run again. Nobody can read this table through the website: RLS on, no read policies.

create table if not exists public.tt_signups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  form text not null,
  page text,
  data jsonb not null,
  emailed boolean not null default false,
  seen boolean not null default false
);
alter table public.tt_signups enable row level security;
revoke all on public.tt_signups from anon, authenticated;

create or replace function public.tt_submit_signup(p_form text, p_page text, p_data jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if p_form is null or length(p_form) > 40 or p_data is null or jsonb_typeof(p_data) <> 'object'
     or length(p_data::text) > 20000 then
    raise exception 'bad sign-up';
  end if;
  -- flood guard: at most 30 sign-ups an hour across the site
  if (select count(*) from tt_signups where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many';
  end if;
  insert into tt_signups(form, page, data) values (p_form, left(p_page, 200), p_data) returning id into new_id;
  return new_id;
end $$;

create or replace function public.tt_signup_emailed(p_id bigint)
returns void language sql security definer set search_path = public as $$
  update tt_signups set emailed = true where id = p_id and created_at > now() - interval '10 minutes';
$$;

revoke all on function public.tt_submit_signup(text, text, jsonb) from public;
revoke all on function public.tt_signup_emailed(bigint) from public;
grant execute on function public.tt_submit_signup(text, text, jsonb) to anon, authenticated;
grant execute on function public.tt_signup_emailed(bigint) to anon, authenticated;

notify pgrst, 'reload schema';

-- To see sign-ups later:  select created_at, form, data from public.tt_signups order by id desc;
