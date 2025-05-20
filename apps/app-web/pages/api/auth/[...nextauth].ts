import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth/next";
import type { NextAuthOptions, Session as NextAuthSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@plated/db/src/mongoClient";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    // annotate the args so TS knows their types
    async session({
      session,
      token,
    }: {
      session: NextAuthSession;
      token: JWT;
    }): Promise<NextAuthSession> {
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, authOptions);
}
