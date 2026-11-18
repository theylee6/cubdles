import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Cubdles.",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl">Welcome back</h1>
        <p className="text-mocha">Good to see you again.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-linen" />}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-mocha">
        New here?{" "}
        <Link href="/join" className="font-medium text-clay underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
