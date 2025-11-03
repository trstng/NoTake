# NoTake

> **Neon Terminal** aesthetic prediction market analytics dashboard

A TraderVue-style web app for tracking and analyzing prediction market trades from platforms like Kalshi and Polymarket.

## Features

### ✅ Completed (MVP Foundation)

- **Authentication System**
  - Email/password login and signup
  - Magic link authentication
  - Supabase Auth integration with RLS
  - Protected dashboard routes

- **Neon Terminal Theme**
  - Custom color palette (#00FFAA primary, #FFD500 accent)
  - Dark mode optimized
  - Animated glow effects
  - Monospace font aesthetic

- **Dashboard Layout**
  - Sidebar navigation
  - Protected routes
  - User profile display
  - Responsive design

- **Database Schema**
  - `profiles` - User profiles
  - `trades` - Individual trade records
  - `positions` - Aggregated positions
  - `daily_stats` - Daily P&L statistics
  - Row Level Security (RLS) policies

### 🚧 In Progress / TODO

- CSV import functionality
- Equity curve visualization (Recharts)
- Trades table with filtering
- Analytics pages (per-market, tags, drawdown)
- Real-time P&L updates (Supabase Realtime)
- Position tracking and calculations
- Market performance breakdowns

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript, React Server Components)
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** TanStack Query + Zustand
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth
- **Charts:** Recharts
- **Tables:** TanStack Table
- **Deployment:** Vercel-ready

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A Supabase account (free tier works)

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy and paste the SQL from `DATABASE_SCHEMA.md` to set up tables
4. Enable **Email** authentication in **Authentication > Providers**

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under **API**.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 6. Create an Account

1. Navigate to `/auth/signup`
2. Create an account with email/password
3. Check your email for the confirmation link
4. Sign in at `/auth/login`

## Project Structure

```
NoTake/
├── app/
│   ├── auth/              # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── callback/      # OAuth callback handler
│   ├── dashboard/         # Protected dashboard pages
│   │   ├── layout.tsx     # Dashboard layout with nav
│   │   └── page.tsx       # Overview page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   ├── globals.css        # Global styles + Neon theme
│   └── providers.tsx      # Query & Theme providers
├── components/
│   ├── auth/              # Auth components
│   ├── layout/            # Layout components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── supabase/          # Supabase client config
│   ├── database.types.ts  # TypeScript types
│   └── utils.ts           # Utility functions
├── middleware.ts          # Auth middleware
└── DATABASE_SCHEMA.md     # Database setup guide
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Database Schema

See `DATABASE_SCHEMA.md` for complete schema documentation including:

- Table definitions
- RLS policies
- Indexes
- Functions and triggers
- Realtime configuration

## Color Palette (Neon Terminal)

```css
Primary:    #00FFAA (Neon green)
Accent:     #FFD500 (Yellow)
Background: #000B14 (Deep blue-black)
Surface:    #001122 (Dark blue)
Profit:     #39FF14 (Bright green)
Loss:       #FF3131 (Red)
Text:       #E2E8F0 (Light gray)
```

## Next Steps for Development

1. **CSV Import** - Build upload dialog with papaparse validation
2. **Equity Curve** - Recharts line chart with daily P&L data
3. **Trades Table** - TanStack Table with sorting, filtering, virtualization
4. **Analytics** - Per-market stats, tag filters, monthly heatmap
5. **Realtime** - Subscribe to trade inserts for live updates
6. **API Integration** - Connect to Kalshi/Polymarket APIs for live prices

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```bash
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
```

## License

MIT

## Contributing

This is a personal analytics dashboard. Feel free to fork and customize for your needs.

---

Built with ⚡ and the Neon Terminal aesthetic
