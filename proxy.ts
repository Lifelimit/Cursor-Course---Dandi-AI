export { auth as proxy } from "@/auth";

// Optionally, specify the routes that should be protected
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
