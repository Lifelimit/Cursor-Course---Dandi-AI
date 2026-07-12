import { publicEnv } from "@/lib/env";

export const getURL = () => {
  return new URL(publicEnv.NEXT_PUBLIC_APP_URL).origin;
};
