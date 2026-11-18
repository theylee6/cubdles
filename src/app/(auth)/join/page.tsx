import type { Metadata } from "next";
import Link from "next/link";
import { OAuthButtons, OrDivider } from "@/components/auth/oauth-buttons";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Join",
  description: "Create your free Cubdles account.",
};

export default function JoinPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl">Come on in</h1>
        <p className="text-mocha">Create your free account. You can finish your profile at your own pace.</p>
      </div>
      <OAuthButtons verb="Sign up" />
      <OrDivider />
      <JoinForm />
      <p className="text-sm text-mocha">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-clay underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
