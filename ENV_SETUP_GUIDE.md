# Environment Variables Setup Guide

## Quick Setup Checklist

### 1. Create `.env` file in the project root

Create a file named `.env` (not `.env.txt` or anything else) in the root directory of your project:
```
C:\Users\12077\Desktop\ai-assistant-app\.env
```

### 2. Add your Supabase credentials

Open the `.env` file and add these two lines (replace with your actual values):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important formatting rules:**
- ✅ NO spaces around the `=` sign
- ✅ NO quotes around the values (unless the value itself contains spaces)
- ✅ NO trailing spaces
- ✅ Each variable on its own line
- ✅ Must start with `EXPO_PUBLIC_` prefix

### 3. Get your Supabase credentials

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → This is your `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 4. Example `.env` file

```env
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
```

### 5. Restart your Expo dev server

**CRITICAL:** After creating or modifying the `.env` file, you MUST:

1. Stop your current Expo server (press `Ctrl+C` in the terminal)
2. Start it again with `npm start` or `expo start`
3. Clear the cache if needed: `expo start -c`

### 6. Verify it's working

When you open the signup page, check your console/terminal. You should see debug output like:

```
=== Supabase Configuration Debug ===
supabaseUrl (from Constants): https://your-project-id.supabase.co
supabaseAnonKey (from Constants): eyJhbGciOiJIUzI1NiIs...
isConfigured: true
===================================
```

If you see `NOT SET` or `placeholder`, the `.env` file is not being loaded correctly.

## Common Issues

### Issue: "Network request failed" or "Supabase is not configured"

**Solutions:**
1. ✅ Verify `.env` file exists in the project root (same folder as `package.json`)
2. ✅ Check file name is exactly `.env` (not `.env.txt` or `.env.local`)
3. ✅ Verify no spaces around `=` sign
4. ✅ Make sure variables start with `EXPO_PUBLIC_`
5. ✅ **Restart Expo dev server** after creating/modifying `.env`
6. ✅ Check console for debug output to see what values are loaded

### Issue: Variables show as "NOT SET" in debug output

**Solutions:**
1. Make sure `dotenv` package is installed: `npm install dotenv --legacy-peer-deps`
2. Verify `app.config.js` has `require('dotenv').config();` at the top
3. Restart Expo dev server
4. Try clearing cache: `expo start -c`

### Issue: File not found errors

Make sure the `.env` file is in the correct location:
- ✅ Correct: `C:\Users\12077\Desktop\ai-assistant-app\.env`
- ❌ Wrong: `C:\Users\12077\Desktop\.env`
- ❌ Wrong: `C:\Users\12077\Desktop\ai-assistant-app\app\.env`

## File Structure

Your project should look like this:

```
ai-assistant-app/
├── .env                    ← Create this file here
├── app.config.js
├── package.json
├── app/
├── lib/
└── ...
```

## Still Having Issues?

1. Check the console/terminal output when the app starts
2. Look for the debug output on the signup page
3. Verify your Supabase project is active and accessible
4. Make sure your internet connection is working
5. Try accessing your Supabase URL in a browser to verify it's reachable

## Next Steps

Once your `.env` file is set up correctly:
1. The debug output will show `isConfigured: true`
2. You should be able to sign up without "network request failed" errors
3. Authentication will work properly

