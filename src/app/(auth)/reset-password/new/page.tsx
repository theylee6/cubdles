import type { Metadata } from "next";
import { NewPasswordForm } from "../reset-forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function NewPasswordPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl">Choose a new password</h1>
        <p className="text-mocha">You&rsquo;ll stay logged in on this device afterwards.</p>
      </div>
      <NewPasswordForm />
    </div>
  );
}
