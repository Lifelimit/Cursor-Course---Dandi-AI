import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
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
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user, error } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("email", credentials.email)
          .single();

        if (error || !user || !user.hashed_password) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.hashed_password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
        };
      }
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For credentials, user is already verified in authorize()
      if (account?.provider === "credentials") return true;

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

    async jwt({ token, account, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
      } else if (account?.providerAccountId && account.provider !== "credentials") {
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

