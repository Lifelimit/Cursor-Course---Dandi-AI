import { publicEnv } from "@/lib/env";

export const getURL = () => {
  let url =
    publicEnv.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    publicEnv.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "http://localhost:3000/";
  
  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`;
  // Remove trailing slash if present
  url = url.endsWith("/") ? url.slice(0, -1) : url;
  
  
  return url;
};
