import { z } from "zod";

const requiredString = (name: string) =>
  z
    .string({
      required_error: `${name} is required.`,
      invalid_type_error: `${name} must be a string.`,
    })
    .trim()
    .min(1, `${name} is required.`);

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().optional()
);

const demoKeyString = z.preprocess(
  (value) => (value === "" || value === undefined ? "sk_live_demo_key_dandi_2026" : value),
  z.string().trim().default("sk_live_demo_key_dandi_2026")
);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: requiredString("NEXT_PUBLIC_SUPABASE_URL").url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: requiredString("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  NEXT_PUBLIC_APP_URL: requiredString("NEXT_PUBLIC_APP_URL").url(),
  NEXT_PUBLIC_SITE_URL: optionalString,
  NEXT_PUBLIC_VERCEL_URL: optionalString,
  NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID: requiredString(
    "NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID"
  ),
  NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID: requiredString(
    "NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID"
  ),
  NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID: requiredString(
    "NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID"
  ),
  NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID: requiredString(
    "NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID"
  ),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: requiredString("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requiredString("STRIPE_WEBHOOK_SECRET"),
  UPSTASH_REDIS_REST_URL: requiredString("UPSTASH_REDIS_REST_URL").url(),
  UPSTASH_REDIS_REST_TOKEN: requiredString("UPSTASH_REDIS_REST_TOKEN"),
  GOOGLE_API_KEY: requiredString("GOOGLE_API_KEY"),
  DEMO_API_KEY: demoKeyString,
  GITHUB_TOKEN: optionalString,
  ALLOWED_API_ORIGINS: optionalString,
  /** Used for HMAC-SHA256 hashing of API keys. Must be a long random secret. */
  API_KEY_HMAC_SECRET: requiredString("API_KEY_HMAC_SECRET"),
});

const rawPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
  NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID:
    process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
  NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID:
    process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
  NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID:
    process.env.NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID,
  NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID:
    process.env.NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID,
};

export const publicEnv = publicEnvSchema.parse(rawPublicEnv);

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv() {
  cachedServerEnv ??= serverEnvSchema.parse({
    ...rawPublicEnv,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    DEMO_API_KEY: process.env.DEMO_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    ALLOWED_API_ORIGINS: process.env.ALLOWED_API_ORIGINS,
    API_KEY_HMAC_SECRET: process.env.API_KEY_HMAC_SECRET,
  });

  return cachedServerEnv;
}

export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string | symbol) {
    if (typeof prop === "symbol") {
      return undefined;
    }

    return getServerEnv()[prop as keyof ServerEnv];
  },
});
