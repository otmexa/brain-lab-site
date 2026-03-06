# brain-lab-site
Open-source website for neuroscience research, publications, and computational tools.

## Supabase setup

This repo is prepared to load Supabase public runtime configuration from a Netlify Function. The site uses:

- Supabase Auth for `/admin/`
- Supabase Database for public content blocks
- Supabase Storage for images and downloadable files

Required Netlify environment variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

Do not commit database passwords, `service_role` keys, or full database URLs into the repository. Keep server-only secrets in Netlify environment variables and use them only from server-side code.

The schema and RLS policies live in `supabase/schema.sql`.
