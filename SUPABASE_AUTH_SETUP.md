# Supabase Authentication Setup Guide

This guide will help you set up Supabase authentication for your Expo app.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details:
   - **Name**: Choose a name for your project
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project" and wait for it to be ready (takes ~2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find two important values:
   - **Project URL**: This is your `EXPO_PUBLIC_SUPABASE_URL`
   - **anon/public key**: This is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Configure Environment Variables

Create a `.env` file in the root of your project with the following:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: 
- Never commit your `.env` file to git (it's already in `.gitignore`)
- The `EXPO_PUBLIC_` prefix is required for Expo to expose these variables to your app

## Step 4: Set Up Authentication in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider (it's enabled by default)
3. Configure email settings:
   - **Enable email confirmations**: You can disable this for development, but enable it for production
   - **Site URL**: Set to your app's URL scheme (e.g., `ai-assistant://`)
   - **Redirect URLs**: Add your app's redirect URLs

### For Development (Email Confirmation Disabled):
- Go to **Authentication** → **Settings**
- Under **Email Auth**, toggle off "Enable email confirmations"
- This allows users to sign up and immediately sign in without email verification

### For Production:
- Keep email confirmations enabled
- Configure your email templates in **Authentication** → **Email Templates**

## Step 5: Set Up Database Tables

Your app requires a `user_prefs` table. Run this SQL in your Supabase SQL Editor:

```sql
-- Create user_prefs table
CREATE TABLE IF NOT EXISTS user_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biometric_enabled BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/New_York',
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only read/update their own preferences
CREATE POLICY "Users can view own prefs"
  ON user_prefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prefs"
  ON user_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prefs"
  ON user_prefs FOR UPDATE
  USING (auth.uid() = user_id);
```

## Step 6: Test Your Setup

1. Restart your Expo development server:
   ```bash
   npm start
   ```

2. Open your app and navigate to the login screen
3. Try creating a new account:
   - Enter an email and password
   - Click "Sign Up"
   - If email confirmation is disabled, you should be automatically signed in
   - If enabled, check your email for the confirmation link

4. Try signing in with your new account

## Troubleshooting

### "Missing Supabase environment variables" warning
- Make sure your `.env` file exists in the project root
- Verify the variable names start with `EXPO_PUBLIC_`
- Restart your Expo dev server after creating/updating `.env`

### "Invalid login credentials" error
- Check that you're using the correct email and password
- If you just signed up, make sure email confirmation is disabled or you've confirmed your email

### "User already registered" error
- This email is already in use. Try signing in instead or use a different email

### Authentication not persisting
- Check that `AsyncStorage` is properly configured (it should be automatic)
- Verify your Supabase URL and anon key are correct

### Database errors when creating user_prefs
- Make sure you've run the SQL to create the `user_prefs` table
- Check that Row Level Security policies are set up correctly
- Verify the table structure matches the schema in `lib/schemas.ts`

## Next Steps

Once authentication is working:
1. Test the password reset flow
2. Set up email templates in Supabase for better user experience
3. Configure additional auth providers (Google, Apple, etc.) if needed
4. Set up proper error monitoring for production

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)

