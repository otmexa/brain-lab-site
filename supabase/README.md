# Supabase setup

This project uses:

- Supabase Auth for the mini admin
- Supabase Database for public content entries
- Supabase Storage for images and downloadable files

## Apply the schema

Run `supabase/schema.sql` in the Supabase SQL Editor, or execute it with `psql` using a local `DATABASE_URL`.

## Give admin access to the site owner

1. Insert the owner email into the allowlist:

```sql
insert into public.admin_allowlist (email, role)
values ('owner@example.com', 'owner')
on conflict (email) do update
set role = excluded.role;
```

2. Create the account from `/admin/`, or create the Auth user in the Supabase dashboard.

3. If the user already existed before the allowlist entry was created, update the role manually:

```sql
update public.profiles
set role = 'owner'
where lower(email) = lower('owner@example.com');
```

## Netlify environment variables

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_STORAGE_BUCKET=brain-lab-assets`
