# Sugar Sensei — case study (short)

## Context

Sugar Sensei is a family-oriented PWA for Type 1 Diabetes workflows: CGM trends, carb estimation, and conversational coaching. It integrates Supabase (auth, data, edge functions), Dexcom sandbox OAuth, and OpenAI-backed features.

## Challenge

Auth-gated apps make portfolio reviews awkward: reviewers must sign up or use shared credentials before they see the product.

## Approach

The app supports an optional **portfolio build** controlled by **`VITE_DEMO_MODE=true`**:

| Route | Purpose |
|-------|---------|
| **`/`** | Public **interactive demo** — mock glucose data, sample members, UI parity; AI coach and carb counter use **local canned “streaming”** responses (no account, no API spend). |
| **`/app`** | **Signed-in** experience — real Supabase session, Dexcom, and edge functions. |
| **`/auth`** | Email/password sign-in and sign-up for the real app. |

Deployments **without** that variable keep the original layout: **`/`** and **`/member/...`** require authentication.

## Try it

- **No credentials (when `VITE_DEMO_MODE` is set on the host):** open the site root, e.g. [https://sugarsensei.vercel.app/](https://sugarsensei.vercel.app/).
- **Full sandbox (credentials):** sign in at `/auth` with the demo account documented in [README.md](./README.md), then use `/app` when portfolio mode is enabled.

## Operations note

`VITE_*` variables are fixed at **build** time. After changing `VITE_DEMO_MODE` in Vercel, **redeploy** so the bundle updates.

---

*For setup, env vars, and Supabase commands, see [README.md](./README.md).*
