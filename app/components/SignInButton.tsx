"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button 
      onClick={() => signIn("github")}
      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:ring-4 focus:ring-blue-300"
    >
      Sign in with GitHub
    </button>
  );
} 