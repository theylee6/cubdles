import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "./reset-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl">Reset your password</h1>
        <p className="text-mocha">Enter your account email and we&rsquo;ll send you a link to choose a new one.</p>
      </div>
      <ResetRequestForm />
      <Link href="/login" className="w-fit text-sm text-clay underline underline-offset-4">
        Back to log in
      </Link>
    </div>
  );
}
