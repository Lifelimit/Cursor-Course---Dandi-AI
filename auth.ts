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

      console.log("NextAuth: Attempting to sync user:", user.email);

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
        
        console.log("NextAuth: User sync successful with ID:", account.providerAccountId);
        return true;
      } catch (err) {
        console.error("NextAuth: Fatal error in sync:", err);
        return true;
      }
    },

    async jwt({ token, account, user }) {
      // Persist the permanent Google ID to the token
      if (account) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      // Use the stable sub (which is the providerAccountId) for the session user ID
      if (session.user && token.sub) {
        session.user.id = token.sub;
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

