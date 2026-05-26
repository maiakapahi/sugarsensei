# Sugar Sensei

Sugar Sensei is a personal-use diabetes management PWA built with React, Supabase, and Dexcom integration. I originally built it for my son, who lives with Type 1 Diabetes, to make CGM trends, carb counting, and day-to-day decisions easier to manage in one place.

## Demo access

Visit **[sugarsensei.vercel.app](https://sugarsensei.vercel.app)** and click **"Try Demo Account"** — no sign up needed. This auto-logs in to a pre-configured account with live Dexcom sandbox CGM data, real AI carb counting, and the full AI coaching experience.

The demo account (`demo@sugarsensei.ca`) should remain connected to Dexcom sandbox. Do not change its password or disconnect Dexcom.

## Routing

- **`/`** — login page if not signed in; family dashboard if signed in
- **`/member/:memberId`** — member glucose dashboard
- **`/dexcom-callback`** — Dexcom OAuth redirect handler

## Disclaimer

Sugar Sensei is a personal prototype built for learning and exploration of AI-assisted workflows and healthcare integrations.

It is not a medical device and is not intended to provide medical advice, diagnosis, or treatment decisions.

All data is sandbox-based.

## Highlights

- Dexcom OAuth flow with token storage and auto-refresh in Supabase
- Family member management with row-level security
- AI carb counting with photo upload — works for all users including demo
- AI coach for CGM trend analysis using all available data
- Glucose chart with day-labelled x-axis and time range tabs that grey out when data is unavailable
- Mobile-friendly PWA with installable manifest

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase Auth, Postgres, and Edge Functions
- OpenAI for AI features
- Dexcom API for CGM integration (sandbox by default; EU production-ready)

## Local development

Prerequisites:

- Node.js 20+
- npm
- Supabase CLI available through `npx supabase`

Install dependencies:

```sh
npm install
```

Run the app locally:

```sh
npm run dev
```

## Environment

Frontend environment variables:

```sh
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Supabase Edge Function secrets:

```sh
OPENAI_API_KEY=your_openai_api_key
DEXCOM_CLIENT_ID=your_dexcom_client_id
DEXCOM_CLIENT_SECRET=your_dexcom_client_secret
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase setup

Link the repo to your project:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Apply migrations:

```sh
npx supabase db push
```

Set secrets:

```sh
npx supabase secrets set OPENAI_API_KEY=your_openai_api_key
npx supabase secrets set DEXCOM_CLIENT_ID=your_dexcom_client_id
npx supabase secrets set DEXCOM_CLIENT_SECRET=your_dexcom_client_secret
npx supabase secrets set SUPABASE_ANON_KEY=your_supabase_anon_key
```

Deploy functions:

```sh
npx supabase functions deploy ai-coach
npx supabase functions deploy carb-counter
npx supabase functions deploy dexcom-auth
npx supabase functions deploy dexcom-callback
npx supabase functions deploy dexcom-data
```

## Vercel deployment

Deploy the frontend on Vercel with:

- Build command: `npm run build`
- Output directory: `dist`

Set these Vercel environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

After deploy, set your Supabase Auth site URL and redirect URLs to your Vercel domain.

## Dexcom integration

Configured for Dexcom sandbox by default (`sandbox-api.dexcom.com`). For production use outside the US, switch the base URL to `api.dexcom.eu` and provision credentials through Dexcom API support.

Set the redirect URI to:

```text
https://your-vercel-domain/dexcom-callback
```

Dexcom docs: [developer.dexcom.com](https://developer.dexcom.com/)

## Security notes

- Do not commit `.env` files or secrets.
- Keep OpenAI and Dexcom credentials in Supabase secrets, not in the browser.
- Redeploy Supabase functions after changing auth rules or secrets.
