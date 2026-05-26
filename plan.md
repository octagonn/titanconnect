# Supabase Migration Plan

## Context
The original Supabase project (`gzfhfwiizdlptcxsdqxt.supabase.co`) is under a friend's account and is currently down (DNS returns NXDOMAIN — likely paused/deleted on the free tier). All the schema and config needed to recreate it is already in this repo.

## Steps

### 1. Create a new Supabase project
- Go to `app.supabase.com`, sign in with your account
- Click **New Project**, give it a name (e.g. `titanconnect`)
- Wait for it to finish provisioning (~2 min)

### 2. Run the schema
- In your new project, go to **SQL Editor**
- Paste the entire contents of `expo/supabase-schema.sql` and run it
- This creates all tables, RLS policies, functions, and triggers

### 3. Set up storage buckets
- Still in the SQL Editor, paste and run `expo/supabase/migrations/20251202000000_storage_setup.sql`
- This creates the `posts` and `avatars` public storage buckets

### 4. Get your new credentials
- Go to **Project Settings → API**
- Copy your **Project URL** and **anon public** key

### 5. Update `expo/lib/supabase.ts`
Replace the two hardcoded constants near the top of the file:
```ts
const FALLBACK_SUPABASE_URL = 'YOUR_NEW_PROJECT_URL';
const FALLBACK_SUPABASE_ANON_KEY = 'YOUR_NEW_ANON_KEY';
```

### 6. Update project references
- In `expo/package.json`, update the `supabase:link` script:
  ```
  "supabase:link": "supabase link --project-ref YOUR_NEW_PROJECT_REF"
  ```
- In `expo/supabase/config.toml`, the `project_id` field is just a local label — you can leave it as `titanconnect` or update it

### 7. Test it
```bash
cd expo
npm run start:lan
```
Try signing up with a new account and confirm everything works.

## Notes
- No user data to migrate — the old project is already offline
- The first migration file (`20251118053602_remote_schema.sql`) is empty — ignore it, the full schema is in `supabase-schema.sql`
- `npm start` (tunnel mode) requires an ngrok auth token; use `npm run start:lan` instead for local dev
