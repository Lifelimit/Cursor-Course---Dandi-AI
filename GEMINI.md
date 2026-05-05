# 🤖 GEMINI / AGENT RULES FOR DANDI AI
- **Environment:** Vercel, Supabase, and Upstash (All Free Tiers).
- **Package Manager:** EXCLUSIVELY use `yarn`. Never use `npm`, `npx`, or `pnpm`.
- **Authentication:** We use `@supabase/ssr`. We do NOT use NextAuth.
- **Security:** Enforce Row Level Security (RLS) natively. The `supabaseAdmin` key is strictly for server-to-server webhooks bypassing RLS.
