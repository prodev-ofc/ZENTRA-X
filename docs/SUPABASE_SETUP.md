# ZENTRAX Supabase setup

This is the database foundation for the selected Supabase project:

`https://mbcqnhxgzvesvfqffbti.supabase.co`

It is not connected to the live app until the migration is applied and the frontend environment variables are configured.

## 1. Apply the database migration

1. Open the selected ZENTRAX project in Supabase.
2. Open **SQL Editor** and create a new query.
3. Copy the complete contents of `supabase/migrations/202611050001_zentrax_foundation.sql` from this repository.
4. Run it once. Do not run it repeatedly; the migration creates PostgreSQL enum types and triggers.

## 2. Add the two initial Owners

After the migration succeeds, run this separately in Supabase SQL Editor:

```sql
insert into private.owner_allowlist (email)
values
  ('alextheon101@gmail.com'),
  ('a.beeygutsa@gmail.com')
on conflict (email) do nothing;

-- Promote either account if it was already registered and email-verified.
update public.profiles p
set role = 'owner'
from auth.users u
where u.id = p.id
  and u.email_confirmed_at is not null
  and lower(u.email) in (
    select email from private.owner_allowlist
  );
```

The allowlist is stored in a non-exposed schema. Owner status is tied to verified email addresses, not editable signup metadata.

## 3. Configure environment variables

Set these in Vercel **Project → Settings → Environment Variables**, and in your local `.env` file:

- `SUPABASE_URL=https://mbcqnhxgzvesvfqffbti.supabase.co`
- `SUPABASE_ANON_KEY=` the publishable key supplied for this project

The publishable key is designed for browser use when Row Level Security is correctly enabled. Never put a database password or service-role/secret key in frontend code, GitHub, or a public build variable.

## 4. Important implementation notes

This migration creates the database foundation, not the completed app integration. The application still needs Supabase Auth screens, session handling, moderation UI, owner-only admin management, and analytics dashboards.

Users can edit only safe descriptive fields on their own unmoderated posts. Only trusted staff-authorized code should change moderation status or download permissions. The current client-side event insert policies are a basic foundation; production analytics should be recorded through trusted server/edge functions to reduce event spoofing.

Media uploads need cloud object storage and signed uploads. Do not store large video files on Vercel's local filesystem.
