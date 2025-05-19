"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session } = useSession();
  if (session) {
    return (
      <button
        onClick={() => signOut()}
        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
      >
        Sign out ({session.user.email})
      </button>
    );
  }
  return (
    <button
      onClick={() => signIn("google")}
      className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
    >
      Sign in with Google
    </button>
  );
}
