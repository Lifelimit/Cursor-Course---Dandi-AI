import { auth } from "@/auth";

export function proxy(...args: Parameters<typeof auth>) {
  return auth(...args);
}

// Optionally, specify the routes that should be protected
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

