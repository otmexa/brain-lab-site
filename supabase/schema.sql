create extension if not exists pgcrypto;

create table if not exists public.admin_allowlist (
  email text primary key,
  role text not null default 'owner' check (role in ('owner', 'editor')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

create or replace function public.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text := 'viewer';
begin
  if exists (
    select 1
    from public.admin_allowlist allowlist
    where lower(allowlist.email) = lower(new.email)
  ) then
    select allowlist.role
      into assigned_role
    from public.admin_allowlist allowlist
    where lower(allowlist.email) = lower(new.email)
    limit 1;
  end if;

  insert into public.profiles (user_id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    role = case
      when public.profiles.role = 'owner' then public.profiles.role
      else assigned_role
    end,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row
execute procedure public.handle_auth_user();

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

create table if not exists public.content_entries (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null check (page_slug in ('home', 'publications', 'people', 'resources')),
  block_key text not null,
  entry_type text not null default 'note' check (entry_type in ('note', 'publication', 'profile', 'download', 'link')),
  title text,
  body text,
  link_label text,
  link_url text,
  image_path text,
  file_path text,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid references public.profiles (user_id) on delete set null,
  updated_by uuid references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint content_entries_page_block_unique unique (page_slug, block_key)
);

drop trigger if exists content_entries_set_updated_at on public.content_entries;
create trigger content_entries_set_updated_at
before update on public.content_entries
for each row
execute procedure public.set_updated_at();

alter table public.admin_allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.content_entries enable row level security;

drop policy if exists "Admins can view allowlist" on public.admin_allowlist;
create policy "Admins can view allowlist"
on public.admin_allowlist
for select
to authenticated
using (public.is_site_admin());

drop policy if exists "Admins can manage allowlist" on public.admin_allowlist;
create policy "Admins can manage allowlist"
on public.admin_allowlist
for all
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id or public.is_site_admin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id or public.is_site_admin())
with check ((select auth.uid()) = user_id or public.is_site_admin());

drop policy if exists "Published content is public" on public.content_entries;
create policy "Published content is public"
on public.content_entries
for select
to anon, authenticated
using (is_published = true or public.is_site_admin());

drop policy if exists "Admins can insert content" on public.content_entries;
create policy "Admins can insert content"
on public.content_entries
for insert
to authenticated
with check (public.is_site_admin());

drop policy if exists "Admins can update content" on public.content_entries;
create policy "Admins can update content"
on public.content_entries
for update
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

drop policy if exists "Admins can delete content" on public.content_entries;
create policy "Admins can delete content"
on public.content_entries
for delete
to authenticated
using (public.is_site_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brain-lab-assets',
  'brain-lab-assets',
  true,
  52428800,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/zip'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view site assets" on storage.objects;
create policy "Public can view site assets"
on storage.objects
for select
to public
using (bucket_id = 'brain-lab-assets');

drop policy if exists "Admins can upload site assets" on storage.objects;
create policy "Admins can upload site assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'brain-lab-assets'
  and public.is_site_admin()
);

drop policy if exists "Admins can update site assets" on storage.objects;
create policy "Admins can update site assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'brain-lab-assets'
  and public.is_site_admin()
)
with check (
  bucket_id = 'brain-lab-assets'
  and public.is_site_admin()
);

drop policy if exists "Admins can delete site assets" on storage.objects;
create policy "Admins can delete site assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'brain-lab-assets'
  and public.is_site_admin()
);
