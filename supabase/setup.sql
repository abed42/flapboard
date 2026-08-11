-- Flapboard — Supabase setup
--
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
--
-- It creates everything the board needs:
--   1. signup_events  — one row per signup; its INSERTs drive the realtime updates
--   2. get_signup_count() — the RPC the board calls to read the total
--   3. a trigger on auth.users that records a signup event on every new user

-- 1. Event table ------------------------------------------------------------
-- Deliberately content-free (no user id, no email): its only job is to make
-- Realtime fire an INSERT notification, so nothing sensitive is ever
-- broadcast to anonymous subscribers.
create table if not exists public.signup_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.signup_events enable row level security;

-- Realtime respects RLS: anonymous clients must be able to SELECT the table
-- or they will never receive the INSERT notifications.
drop policy if exists "Signup events are publicly readable" on public.signup_events;
create policy "Signup events are publicly readable"
  on public.signup_events
  for select
  using (true);

-- Broadcast INSERTs on this table over Supabase Realtime.
alter publication supabase_realtime add table public.signup_events;

-- 2. Count function ---------------------------------------------------------
-- SECURITY DEFINER so it may count auth.users, which clients cannot read
-- directly. It exposes a single number and nothing else.
create or replace function public.get_signup_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint from auth.users;
$$;

grant execute on function public.get_signup_count() to anon, authenticated;

-- 3. Signup trigger ---------------------------------------------------------
create or replace function public.handle_new_user_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.signup_events default values;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_signup_event on auth.users;
create trigger on_auth_user_created_signup_event
  after insert on auth.users
  for each row
  execute function public.handle_new_user_signup();
