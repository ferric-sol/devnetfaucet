import type { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { Session } from "next-auth";

// Extend the Session type to include username
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string;
    }
  }
}

// Extend the JWT type to include username
declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      profile(profile) {
        console.log('GitHub profile:', profile);
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.login,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      console.log('Session callback - token:', token);
      console.log('Session callback - session before:', session);
      if (session.user) {
        session.user.name = token.name as string;
        session.user.username = token.username as string;
      }
      console.log('Session callback - session after:', session);
      return session;
    },
    async jwt({ token, user, account, profile }) {
      console.log('JWT callback - token before:', token);
      console.log('JWT callback - user:', user);
      console.log('JWT callback - profile:', profile);
      
      // Ensure username is captured from the user object (which comes from our profile() function)
      if (user && 'username' in user) {
        token.username = user.username as string;
      }
      
      // Fallback to profile.login if available
      if (!token.username && profile && (profile as any).login) {
        token.username = (profile as any).login;
      }
      
      console.log('JWT callback - token after:', token);
      return token;
    },
  },
  debug: true, // Enable debug mode for more detailed logs
}; 