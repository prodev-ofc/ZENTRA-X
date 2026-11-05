# ZENTRAX Supabase setup

This repository contains the initial database foundation. It is not connected to the live app until the migration is applied and the frontend environment variables are configured.

## 1. Apply the database migration

1. Open the ZENTRAX project in Supabase.
2. Open **SQL Editor** and create a new query.
3. Copy the complete contents of `supabase/migrations/202611050001_zentrax_foundation.sql` from this repository.
4. Run it once. It creates profiles, content submissions, likes, analytics events, role helpers, and Row Level Security policies.

## 2. Add the initial Owner email allowlist

In the Supabase SQL Editor, run this separately, replacing the example values with the two owner email addresses supplied by the project owner:

```sql
insert into private.owner_allowlist (email)
values
  (lower('first-owner@example.com')),
  (lower('second-owner@example.com'))
on conflict (email) do nothing;

-- If either owner already registered and verified before the allowlist was added:
update public.profiles p
set role = 'owner'
from auth.users u
where u.id = p.id
  and u.email_confirmed_at is not null
  and lower(u.email) in (
    select email from private.owner_allowlist
  );
```

The allowlist is stored in a non-exposed schema. Do not add owner emails to browser code or editable user metadata. The migration promotes allowlisted accounts only after email verification.

## 3. Frontend environment variables

Set these in Vercel **Project → Settings → Environment Variables**, and in a local `.env` file for development:

- `SUPABASE_URL` = your project URL
- `SUPABASE_ANON_KEY` = the project's publishable key (or legacy anon key)

Only use the publishable/anon key in browser code. Never expose the database password or service-role/secret key in frontend code, Git, or public build variables.

## 4. Important next integration work

The migration is the database foundation, not the finished app integration. The next application changes must add Supabase Auth screens, username registration, session handling, content moderation UI, secure role-management endpoints, and dashboards. Media uploads need a private storage bucket and signed uploads; do not store large video files on Vercel's local filesystem.

Role promotion and admin management must be performed by trusted server-side code. Do not allow users to update their own `role`.
