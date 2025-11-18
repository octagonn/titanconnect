# Supabase Setup Guide for TitanConnect

## 1. Get Your Supabase Credentials

1. Go to your Supabase project dashboard at [supabase.com](https://supabase.com)
2. Click on your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Project API anon/public key** (long string starting with `eyJ...`)

## 2. Configure Environment Variables (optional override)

The TitanConnect Supabase project URL and anon key are already hardcoded in `lib/supabase.ts` for the
main CSUF project, so you do **not** need to create `.env.local` just to get the app working.

Use `.env.local` only if you want to point the app at a different Supabase project (for example, your
own dev/staging project):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Notes:

- The `.env.local` file is gitignored for safety. Never commit it to version control.
- The client logs `Supabase client configured { supabaseUrl, anonKeyPresent }` at startup so you can
  confirm which project it is using.
- The default TitanConnect build only trusts env URLs that still point at the TitanConnect project; if
  the env URL looks wrong, it falls back to the hardcoded project URL to avoid silent misconfiguration.

## 3. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **Run** to execute the SQL

This will create:
- All necessary tables (profiles, posts, events, messages, etc.)
- Row Level Security (RLS) policies
- Triggers for automatic profile creation
- Indexes for performance

## 4. Configure Email Authentication

### Enable Email + Password Auth (with email confirmation)
1. In your Supabase dashboard, go to **Authentication → Providers → Email**.
2. Enable the **Email** provider.
3. Under **Email auth**, enable **Email + Password**.
4. Turn **Confirm email** **ON** so users **must verify their email before they can sign in**.
5. (Optional but recommended) Configure your **SITE_URL / Redirect URL** under **Authentication → URL Configuration** so verification emails link back to your app.
6. Update your **Email Templates** to match TitanConnect branding.

### Email Domain Restriction
To restrict signups to CSUF emails only, while allowing both students and faculty:

1. Go to **SQL Editor** and run:

```sql
-- Add email domain validation
create or replace function public.validate_email_domain()
returns trigger as $$
begin
  if new.email not like '%@csu.fullerton.edu'
     and new.email not like '%@fullerton.edu' then
    raise exception 'Only @csu.fullerton.edu or @fullerton.edu email addresses are allowed';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger validate_email_domain_trigger
  before insert on auth.users
  for each row execute procedure public.validate_email_domain();
```

## 5. Storage Setup (Optional - for avatars and images)

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket called `avatars`
3. Create another bucket called `posts`
4. Set both buckets to **Public** if you want images publicly accessible
5. Or set up RLS policies for private access

## 6. Test the Connection

1. Restart your Expo development server
2. Open the app
3. Try signing in with your CSUF email
4. Check your email for the magic link/OTP code
5. Verify that the auth flow works

## 7. Backend Integration (Already Configured)

The following files have been set up:
- `lib/supabase.ts` - Supabase client configuration
- `contexts/AuthContext.tsx` - Authentication context with Supabase
- `types/index.ts` - Updated TypeScript types

## 8. Verify Setup

After completing the steps above:

1. ✅ Environment variables are set in `.env.local`
2. ✅ Database schema is created in Supabase
3. ✅ Email authentication is enabled
4. ✅ Domain restriction is applied (if needed)
5. ✅ App can connect to Supabase

## Next Steps

- Update the welcome/verify-email screens to use the new Supabase auth methods
- Implement CSUF email domain validation in the UI
- Set up storage buckets for user avatars and post images
- Configure email templates in Supabase for better branding
- Add real-time subscriptions for live updates

## Troubleshooting

**Issue**: App can't connect to Supabase
- Check that your `.env.local` file exists and has the correct values
- Restart the Expo development server after adding environment variables
- Verify the Supabase URL and anon key are correct

**Issue**: Authentication not working
- Check that email authentication is enabled in Supabase
- Verify RLS policies are set up correctly
- Check the Supabase logs in the dashboard

**Issue**: Database queries failing
- Verify the schema was created successfully
- Check RLS policies are not blocking legitimate requests
- Look at the Supabase logs for specific errors
