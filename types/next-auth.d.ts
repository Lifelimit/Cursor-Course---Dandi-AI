import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: string;
      full_name?: string | null;
      billing_street?: string | null;
      billing_city?: string | null;
      billing_state?: string | null;
      billing_zip?: string | null;
      billing_country?: string | null;
      payment_method_last4?: string | null;
      payment_method_brand?: string | null;
      payment_method_expiry?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    plan?: string;
  }
}
