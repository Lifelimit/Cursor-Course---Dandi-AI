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
            plan: "Hobby",
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

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
        
        // Fetch the user's plan directly from Supabase to ensure it's always real-time
        try {
          const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("plan")
            .eq("id", session.user.id)
            .single();
            
          if (data && !error) {
            (session.user as any).plan = data.plan || "Hobby";
          } else {
            (session.user as any).plan = "Hobby";
          }
        } catch (err) {
          console.error("NextAuth session callback: Error fetching plan:", err);
          (session.user as any).plan = "Hobby";
        }
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

