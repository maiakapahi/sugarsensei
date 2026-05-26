# Sugar Sensei — case study (short)

## Context

Sugar Sensei is a family-oriented PWA for Type 1 Diabetes management: CGM trend analysis, AI carb counting from photos, and conversational coaching. Built for personal use for my son, it integrates Supabase (auth, data, edge functions), Dexcom OAuth, and OpenAI.

## Challenge

Auth-gated apps make portfolio reviews awkward — reviewers either sign up or skip it entirely. The goal was to give anyone instant access to a fully working version with real data, with zero friction.

## Approach

A **"Try Demo Account"** button on the login page auto-signs in to a pre-configured account connected to the Dexcom sandbox API. Visitors land directly in the app with live CGM data, a working AI carb counter, and the full AI coaching experience — no sign up, no mock data.

The app routing is simple:

| Route | Purpose |
|-------|---------|
| **`/`** | Login page (if not signed in) or family dashboard (if signed in) |
| **`/member/:memberId`** | Individual member glucose dashboard |

## Try it

Visit **[sugarsensei.vercel.app](https://sugarsensei.vercel.app)** and click **"Try Demo Account"**.

---

*For setup, env vars, and Supabase commands, see [README.md](./README.md).*
