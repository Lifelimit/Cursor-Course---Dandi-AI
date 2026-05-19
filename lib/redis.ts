import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/env";

export const redis = new Redis({
  url: serverEnv.UPSTASH_REDIS_REST_URL,
  token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
});
