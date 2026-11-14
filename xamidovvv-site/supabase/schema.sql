-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again on an existing database.

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 60),
  url         text check (url is null or char_length(url) <= 200),
  rating      int  not null check (rating between 1 and 5),
  text        text not null check (char_length(text) between 20 and 600),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);
create index if not exists reviews_status_created_idx on public.reviews (status, created_at desc);

create table if not exists public.site_settings (
  id         int primary key default 1 check (id = 1),
  telegram   text default '',
  channel    text default '',
  instagram  text default '',
  tiktok     text default '',
  phone      text default ''
);
insert into public.site_settings (id) values (1) on conflict do nothing;

-- Who is allowed into /admin. Only the server (Secret key) can read or write this table.
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);

alter table public.reviews        enable row level security;
alter table public.site_settings  enable row level security;
alter table public.admins         enable row level security;

-- Remove the old policies that let ANY logged-in user manage data.
drop policy if exists "admin all reviews"     on public.reviews;
drop policy if exists "admin update settings" on public.site_settings;
drop policy if exists "public read approved"  on public.reviews;
drop policy if exists "public insert pending" on public.reviews;
drop policy if exists "public read settings"  on public.site_settings;

-- Visitors (publishable key): read approved reviews, add a PENDING review, read contacts. Nothing else.
create policy "public read approved"  on public.reviews       for select to anon, authenticated using (status = 'approved');
create policy "public insert pending" on public.reviews       for insert to anon with check (status = 'pending');
create policy "public read settings"  on public.site_settings for select to anon, authenticated using (true);

-- `admins` has RLS on and NO policies: anon and authenticated users cannot touch it at all.
-- Admin actions run on the server with the Secret key, after the admin check.

-- Defense in depth: strip table privileges the public roles do not need.
revoke all on public.admins from anon, authenticated;
revoke update, delete, truncate on public.reviews from anon, authenticated;
revoke insert, update, delete, truncate on public.site_settings from anon, authenticated;

-- Make yourself the admin (use the same e-mail as your Supabase Auth user, lowercase):
-- insert into public.admins (email) values ('you@example.com');
