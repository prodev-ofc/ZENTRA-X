-- ZENTRAX Supabase foundation
-- Apply this migration once in the selected Supabase project.
-- Initial owners are allowlisted separately in docs/SUPABASE_SETUP.md.

create extension if not exists pgcrypto;

create type public.app_role as enum ('user', 'admin', 'owner');
create type public.post_status as enum ('pending', 'approved', 'rejected', 'removed');
create type public.media_kind as enum ('video', 'live', 'external');
create type public.post_event_type as enum ('view', 'download', 'share');
create type public.platform_event_type as enum ('login', 'logout');

create schema if not exists private;

create table private.owner_allowlist (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
revoke all on schema private from public, anon, authenticated;
revoke all on table private.owner_allowlist from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  category text not null,
  media_kind public.media_kind not null default 'video',
  media_url text,
  thumbnail_url text,
  status public.post_status not null default 'pending',
  rights_confirmed boolean not null default false,
  downloads_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_events (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type public.post_event_type not null,
  created_at timestamptz not null default now()
);

create table public.platform_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type public.platform_event_type not null,
  created_at timestamptz not null default now()
);

create index posts_user_id_created_at_idx on public.posts(user_id, created_at desc);
create index posts_status_created_at_idx on public.posts(status, created_at desc);
create index post_events_post_id_type_idx on public.post_events(post_id, event_type);
create index post_events_user_id_idx on public.post_events(user_id);
create index platform_events_type_created_at_idx on public.platform_events(event_type, created_at);

create or replace function private.has_role(required_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = any(required_roles)
  );
$$;
revoke all on function private.has_role(public.app_role[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_role(public.app_role[]) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  safe_username text;
  normalized_email text;
begin
  requested_username := new.raw_user_meta_data ->> 'username';
  safe_username := regexp_replace(coalesce(requested_username, ''), '[^a-zA-Z0-9_]', '', 'g');
  if length(safe_username) < 3 then
    safe_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;
  safe_username := substr(safe_username, 1, 24);
  normalized_email := lower(coalesce(new.email, ''));

  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    safe_username,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    case
      when new.email_confirmed_at is not null and exists (
        select 1 from private.owner_allowlist a where a.email = normalized_email
      ) then 'owner'::public.app_role
      else 'user'::public.app_role
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.promote_allowlisted_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and exists (
    select 1 from private.owner_allowlist a where a.email = lower(coalesce(new.email, ''))
  ) then
    update public.profiles set role = 'owner'::public.app_role where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed_owner on auth.users;
create trigger on_auth_user_confirmed_owner
  after update of email_confirmed_at, email on auth.users
  for each row execute procedure public.promote_allowlisted_owner();

create or replace function public.refresh_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_refresh_updated_at before update on public.profiles
for each row execute procedure public.refresh_updated_at();
create trigger posts_refresh_updated_at before update on public.posts
for each row execute procedure public.refresh_updated_at();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_events enable row level security;
alter table public.platform_events enable row level security;

-- Explicit grants: clients may only update safe profile/content columns.
grant select on public.profiles to authenticated;
grant insert (id, username, display_name) on public.profiles to authenticated;
grant update (username, display_name) on public.profiles to authenticated;
revoke update (role, id, created_at, updated_at) on public.profiles from anon, authenticated;

grant select on public.posts to authenticated;
grant insert (user_id, title, description, category, media_kind, media_url, thumbnail_url, rights_confirmed) on public.posts to authenticated;
grant update (title, description, category, media_kind, media_url, thumbnail_url, rights_confirmed) on public.posts to authenticated;
grant update on public.posts to authenticated;

grant select, insert, delete on public.post_likes to authenticated;
grant select, insert on public.post_events to authenticated;
grant select, insert on public.platform_events to authenticated;

create policy "profiles_read_self_or_staff" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.has_role(array['admin','owner']::public.app_role[])));

create policy "profiles_insert_self_user" on public.profiles
for insert to authenticated
with check (id = (select auth.uid()) and role = 'user');

create policy "profiles_update_self" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "posts_read_approved_or_owner_or_staff" on public.posts
for select to authenticated
using (
  status = 'approved'
  or user_id = (select auth.uid())
  or (select private.has_role(array['admin','owner']::public.app_role[]))
);

create policy "posts_insert_own_pending" on public.posts
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and rights_confirmed = true
  and downloads_enabled = false
);

-- Ordinary users may edit descriptive fields only while their submission is pending/rejected.
create policy "posts_update_own_unmoderated" on public.posts
for update to authenticated
using (user_id = (select auth.uid()) and status in ('pending', 'rejected'))
with check (user_id = (select auth.uid()) and status in ('pending', 'rejected'));

create policy "posts_update_staff" on public.posts
for update to authenticated
using ((select private.has_role(array['admin','owner']::public.app_role[])))
with check ((select private.has_role(array['admin','owner']::public.app_role[])));

create policy "likes_read_visible_posts" on public.post_likes
for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id and (
      p.status = 'approved' or p.user_id = (select auth.uid())
      or (select private.has_role(array['admin','owner']::public.app_role[]))
    )
  )
);

create policy "likes_insert_self_on_approved" on public.post_likes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
);

create policy "likes_delete_self_or_staff" on public.post_likes
for delete to authenticated
using (user_id = (select auth.uid()) or (select private.has_role(array['admin','owner']::public.app_role[])));

create policy "post_events_insert_authenticated" on public.post_events
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
);

create policy "post_events_read_post_owner_or_staff" on public.post_events
for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id and (
      p.user_id = (select auth.uid())
      or (select private.has_role(array['admin','owner']::public.app_role[]))
    )
  )
);

create policy "platform_events_insert_self" on public.platform_events
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "platform_events_read_staff" on public.platform_events
for select to authenticated
using ((select private.has_role(array['admin','owner']::public.app_role[])));

-- Role changes must only be made by trusted server-side owner-authorized code.
