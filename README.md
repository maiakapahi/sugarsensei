# Sugar Sensei

Sugar Sensei is a personal-use diabetes management PWA built with React, Supabase, and Dexcom sandbox integration. I originally built it for my son, who lives with Type 1 Diabetes, to make CGM trends, carb counting, and day-to-day decisions easier to manage in one place.

## Demo access

Use this account for testing the deployed app:

- Email: `demouser@sugarsensei.com`
- Password: `demouser`

This account is demo-only and should stay connected to sandbox or sample data.

## Highlights

- Dexcom sandbox OAuth flow with token storage in Supabase
- Family member management with row-level security
- AI carb counting with image upload support
- AI coach for recent CGM trend summaries
- Mobile-friendly PWA with installable manifest

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase Auth, Postgres, and Edge Functions
- OpenAI for AI features
- Dexcom sandbox API for CGM integration

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

## Dexcom sandbox

This repo is configured for Dexcom sandbox by default. Register a Dexcom developer app and set the redirect URI to:

```text
https://your-vercel-domain/dexcom-callback
```

Dexcom sandbox docs:

- [Authentication](https://developer.dexcom.com/docs/dexcom/authentication)
- [Sandbox Data](https://developer.dexcom.com/docs/dexcom/sandbox-data/)

## Security notes

- Do not commit `.env` files or secrets.
- Keep OpenAI and Dexcom credentials in Supabase secrets, not in the browser.
- Redeploy Supabase functions after changing auth rules or secrets.

## Current status

Current setup supports:

- Supabase auth and member creation
- Dexcom sandbox connection
- AI carb counting
- AI coaching

Production Dexcom support can be added later by making the Dexcom base URL configurable instead of sandbox-only.
