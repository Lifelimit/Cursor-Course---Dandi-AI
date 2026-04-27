import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client for user syncing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account?.providerAccountId) return false;

      try {
        // Use the permanent Google ID (providerAccountId) instead of the random user.id
        const { error } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: account.providerAccountId, 
            email: user.email,
            full_name: user.name,
            avatar_url: user.image,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error("NextAuth: Supabase sync error:", error.message, error.details);
          return true;
        }
        
        return true;
      } catch (err) {
        console.error("NextAuth: Fatal error in sync:", err);
        return true;
      }
    },

    async jwt({ token, account }) {
      // Persist the permanent Google ID to the token as early as possible
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
        token.id = account.providerAccountId;
      }
      return token;
    },

    async session({ session, token }) {
      // Force the session ID to be the stable providerAccountId from the token
      if (session.user) {
        session.user.id = (token.sub || token.id) as string;
      }
      return session;
    },



    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboards");
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      }
      return true;
    },
  },
});

