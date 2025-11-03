# Environment Variables Setup

## ✅ Issue Fixed

**Problem:** Your `.env` file was using colons (`:`) instead of equals (`=`) signs.

**Fixed:** Changed syntax to proper format:
```bash
# Wrong ❌
NEXT_PUBLIC_SUPABASE_URL:https://...

# Correct ✅
NEXT_PUBLIC_SUPABASE_URL=https://...
```

## Current Configuration

Your `.env` file now has valid Supabase credentials:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Configured
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Configured

## How to Test

### 1. Restart Dev Server

Environment variables are only loaded on startup:

```bash
# Kill the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### 2. Verify It Works

Visit: http://localhost:3000

You should now see:
- ✅ No more "URL and Key are required" error
- ✅ App loads correctly
- ✅ Can navigate to auth pages

### 3. Test Authentication

Try signing up:
1. Go to `/auth/signup`
2. Create an account
3. Check your email for confirmation
4. Sign in at `/auth/login`

## Environment File Best Practices

### Development vs Production

**For local development:**
- Use `.env.local` (gitignored, personal credentials)
- Copy from `.env.example` template

**For team sharing:**
- Keep `.env.example` with placeholder values
- Never commit real credentials to git

### Recommended Setup

```bash
# 1. Copy example to local
cp .env.example .env.local

# 2. Add your real credentials to .env.local
# Edit: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# Edit: NEXT_PUBLIC_SUPABASE_ANON_KEY=your_real_key

# 3. The .env.local file is already gitignored
```

## Error Handling Improvements

We've added better error messages throughout:

### Middleware (`middleware.ts`)
- ✅ Checks if credentials exist before creating client
- ✅ Shows warning in console if missing
- ✅ Gracefully skips auth if not configured

### Client (`lib/supabase/client.ts`)
- ✅ Throws descriptive error if credentials missing
- ✅ Tells you exactly what's needed

### Server (`lib/supabase/server.ts`)
- ✅ Same validation as client
- ✅ Clear error messages

## Troubleshooting

### Still Getting Errors?

1. **Restart dev server** (environment vars load on startup)
   ```bash
   # Kill server (Ctrl+C), then:
   npm run dev
   ```

2. **Check .env syntax**
   - Must use `=` not `:`
   - No spaces around `=`
   - No quotes needed for values

3. **Verify Supabase project**
   - Login to https://supabase.com
   - Go to Project Settings → API
   - Confirm URL and anon key match

4. **Check file is being read**
   ```bash
   # Should show your .env file
   ls -la .env*
   ```

### Environment Variables Not Loading?

**Common causes:**
- Dev server not restarted
- File named incorrectly (must be exactly `.env` or `.env.local`)
- Syntax error in file (use `=` not `:`)
- File in wrong directory (must be in project root)

## Next Steps

Now that environment is configured:

1. **Run migrations** in Supabase
   - See `supabase/migrations/README.md`
   - Run all 5 migration files in order

2. **Test the app**
   - Sign up for an account
   - Try importing a CSV
   - Explore the dashboard

3. **Import your Kalshi data**
   - Export from Kalshi → Portfolio → Activity
   - Click "Import Trades" in NoTake
   - Upload CSV file

## Reference

- **Configuration:** See `.env.example` for all available variables
- **Database Setup:** See `DATABASE_SCHEMA.md`
- **Migrations:** See `supabase/migrations/README.md`
- **Quick Start:** See `QUICKSTART.md`
