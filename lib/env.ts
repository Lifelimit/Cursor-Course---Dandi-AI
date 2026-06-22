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
  GOOGLE_API_KEYS: optionalString,
  GOOGLE_API_KEY: optionalString,
  GOOGLE_GENERATIVE_AI_API_KEY: optionalString,
  GOOGLE_EMBEDDING_PRIMARY: optionalString,
  GOOGLE_EMBEDDING_FALLBACK: optionalString,
  DEMO_API_KEY: demoKeyString,
  GITHUB_TOKEN: optionalString,
  GITHUB_APP_ID: optionalString,
  GITHUB_APP_PRIVATE_KEY: optionalString,
  GITHUB_APP_CLIENT_ID: optionalString,
  GITHUB_APP_CLIENT_SECRET: optionalString,
  GITHUB_APP_SLUG: optionalString,
  GITHUB_APP_INSTALLATION_URL: optionalString,
  ALLOWED_API_ORIGINS: optionalString,
  /** Used for HMAC-SHA256 hashing of API keys. Must be a long random secret. */
  API_KEY_HMAC_SECRET: requiredString("API_KEY_HMAC_SECRET"),
}).superRefine((value, ctx) => {
  const googleKeys = [
    value.GOOGLE_API_KEYS,
    value.GOOGLE_API_KEY,
    value.GOOGLE_GENERATIVE_AI_API_KEY,
  ].filter((key) => key && key.trim().length > 0);

  if (googleKeys.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["GOOGLE_API_KEYS"],
      message: "GOOGLE_API_KEYS or a legacy Google API key is required.",
    });
  }
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
    GOOGLE_API_KEYS: process.env.GOOGLE_API_KEYS,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GOOGLE_EMBEDDING_PRIMARY: process.env.GOOGLE_EMBEDDING_PRIMARY,
    GOOGLE_EMBEDDING_FALLBACK: process.env.GOOGLE_EMBEDDING_FALLBACK,
    DEMO_API_KEY: process.env.DEMO_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
    GITHUB_APP_CLIENT_ID: process.env.GITHUB_APP_CLIENT_ID,
    GITHUB_APP_CLIENT_SECRET: process.env.GITHUB_APP_CLIENT_SECRET,
    GITHUB_APP_SLUG: process.env.GITHUB_APP_SLUG,
    GITHUB_APP_INSTALLATION_URL: process.env.GITHUB_APP_INSTALLATION_URL,
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
