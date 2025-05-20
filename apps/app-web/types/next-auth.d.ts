import NextAuth, { DefaultSession } from "next-auth";

// Make sure this file is included via tsconfig.json “include”: ["types/**/*.d.ts", ...]
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      /** The MongoDB ObjectId (string) */
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** The MongoDB ObjectId (string) */
    sub: string;
  }
}
