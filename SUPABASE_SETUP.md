# Supabase Setup Guide for TitanConnect

## 1. Get Your Supabase Credentials

1. Go to your Supabase project dashboard at [supabase.com](https://supabase.com)
2. Click on your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Project API anon/public key** (long string starting with `eyJ...`)

## 2. Configure Environment Variables

1. Create a `.env.local` file in the root of your project (copy from `.env.local.template`):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. **Important**: The `.env.local` file is gitignored for security. Never commit it to version control.

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

### For Development (Magic Link)
1. Go to **Authentication** → **Providers** → **Email**
2. Enable **Email provider**
3. Disable **Confirm email** for testing (you can enable it later for production)

### For Production with CSUF Email Domain
1. Go to **Authentication** → **URL Configuration**
2. Set your site URL
3. Go to **Email Templates** and customize the magic link email
4. Optional: Set up SMTP with CSUF mail server for branded emails

### Email Domain Restriction
To restrict signups to `@csu.fullerton.edu` only:

1. Go to **SQL Editor** and run:

```sql
-- Add email domain validation
create or replace function public.validate_email_domain()
returns trigger as $$
begin
  if new.email not like '%@csu.fullerton.edu' then
    raise exception 'Only @csu.fullerton.edu email addresses are allowed';
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
