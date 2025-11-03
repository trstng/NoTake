# NoTake - Quick Start Guide

Get your prediction market analytics dashboard running in 10 minutes!

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

## Step 2: Set Up Supabase (5 min)

### 2.1 Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose a name, database password, and region
4. Wait for project to initialize (~2 mins)

### 2.2 Run Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Open `DATABASE_SCHEMA.md` from this project
3. Copy the SQL for each section:
   - Copy and run **profiles** table + RLS
   - Copy and run **trades** table + RLS
   - Copy and run **positions** table + RLS
   - Copy and run **daily_stats** table + RLS
   - Copy and run **Functions** (handle_new_user trigger)
   - Copy and run **Realtime** config

### 2.3 Enable Email Auth
1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Save changes

### 2.4 Get API Credentials
1. Go to **Project Settings > API**
2. Copy your **Project URL**
3. Copy your **anon public** key

## Step 3: Configure Environment (1 min)

Create `.env.local` in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Paste your URL and key from Step 2.4.

## Step 4: Run the App (1 min)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 5: Create Your Account (2 min)

1. Navigate to `/auth/signup`
2. Enter your email and password
3. Check your email for confirmation link
4. Click the link to verify
5. Return to `/auth/login` and sign in

🎉 **You're in!** You should now see the dashboard.

## Next Steps

### Import Sample Data

Create a CSV file with this format:

```csv
timestamp,market_ticker,market_name,side,price,size,fee,platform
2024-01-15T10:30:00Z,PRES-TRUMP-2024,Trump Wins 2024,buy,0.65,100,1.50,polymarket
2024-01-16T14:20:00Z,UNEMP-JAN-2024,Unemployment < 4%,sell,0.72,50,0.75,kalshi
```

Click **Import Trades** in the dashboard header to upload it.

### Explore the Dashboard

- **Overview**: See your stats and equity curve
- **Trades**: Browse all your trades
- **Analytics**: Per-market and tag analysis
- **Markets**: Market-specific performance

## Troubleshooting

### "Invalid API key" error
- Double-check your `.env.local` file
- Make sure you copied the **anon** key (not service_role)
- Restart the dev server after changing `.env.local`

### Email confirmation not arriving
- Check your spam folder
- In Supabase dashboard, go to **Authentication > Users** to manually confirm
- Or use magic link login instead

### Database errors
- Make sure all SQL from `DATABASE_SCHEMA.md` was run
- Check that RLS policies are enabled
- Verify the `handle_new_user()` function was created

### Can't access dashboard
- Make sure you confirmed your email
- Try logging out and back in
- Check browser console for errors

## Development Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## What's Been Built

✅ Full authentication system (email, magic link)
✅ Protected dashboard with navigation
✅ Neon Terminal theme with animations
✅ Database schema with RLS
✅ CSV import UI (parser ready)
✅ Basic stats cards

## What's Next (TODO)

🚧 Wire up CSV import to Supabase
🚧 Build equity curve chart (Recharts)
🚧 Create trades table with filters
🚧 Add analytics pages
🚧 Implement realtime updates
🚧 Calculate P&L from positions

## Need Help?

- Check `README.md` for detailed documentation
- Review `DATABASE_SCHEMA.md` for database structure
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs

---

**Happy trading analytics!** 📊⚡
