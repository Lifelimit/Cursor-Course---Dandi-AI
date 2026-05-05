export const getURL = () => {
  let url =
    process.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "http://localhost:3000/";
  
  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`;
  // Remove trailing slash if present
  url = url.endsWith("/") ? url.slice(0, -1) : url;
  
  // Hardcode the production URL as requested if we're in production
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
    return "https://dandi-orcin.vercel.app";
  }
  
  return url;
};
