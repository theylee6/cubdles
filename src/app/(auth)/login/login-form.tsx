"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { OAuthButtons, OrDivider } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/primitives";
import { signInAction } from "@/lib/auth/actions";
import type { FormState } from "@/lib/auth/schemas";

const LINK_ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Please log in, or request a new link.",
  callback: "We couldn't finish signing you in. Please try again.",
  not_configured: "Sign-in isn't switched on yet. Please try again later.",
  google_unavailable: "Google sign-in isn't available right now. Please use email instead.",
  apple_unavailable: "Apple sign-in isn't available right now. Please use email instead.",
};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const linkError = LINK_ERRORS[params.get("error") ?? ""];
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, {});
  const e = state.errors ?? {};

  return (
    <div className="flex flex-col gap-7">
      {linkError ? <Notice tone="warning" title="Sign-in problem">{linkError}</Notice> : null}
      <OAuthButtons verb="Continue" next={next} />
      <OrDivider />
      <form action={action} className="flex flex-col gap-5" noValidate>
        {state.message ? <Notice tone="warning" title="Couldn't log in">{state.message}</Notice> : null}
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="email" error={e.email}>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required aria-invalid={!!e.email} aria-describedby={e.email ? "email-error" : undefined} />
        </Field>
        <Field label="Password" htmlFor="password" error={e.password}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!e.password} aria-describedby={e.password ? "password-error" : undefined} />
        </Field>
        <Link href="/reset-password" className="w-fit text-sm text-clay underline underline-offset-4">
          Forgot your password?
        </Link>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </div>
  );
}
