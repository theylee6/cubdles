"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { withRecovery } from "@/components/ui/action-recovery";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/primitives";
import { signUpAction } from "@/lib/auth/actions";
import type { FormState } from "@/lib/auth/schemas";

export function JoinForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(withRecovery(signUpAction), {});
  const [show, setShow] = useState(false);
  const e = state.errors ?? {};

  if (state.ok) {
    return (
      <Notice title="Check your email">
        {state.message} The link expires after a while — if it does, just sign up again with the same email.
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message ? <Notice tone="warning" title="Something went wrong">{state.message}</Notice> : null}
      <Field label="Email" htmlFor="email" error={e.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required aria-invalid={!!e.email} aria-describedby={e.email ? "email-error" : undefined} />
      </Field>
      <Field label="Password" htmlFor="password" error={e.password} hint="At least 10 characters, with a letter and a number.">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            className="pr-12"
            aria-invalid={!!e.password}
            aria-describedby={e.password ? "password-error" : "password-hint"}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-mocha hover:bg-linen"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Confirmations</legend>
        <label className="flex items-start gap-3 text-sm text-cocoa">
          <input type="checkbox" name="adult" className="mt-0.5 size-5 accent-clay" aria-invalid={!!e.adult} />
          <span>I&rsquo;m 18 or older. <span className="text-mocha">(We&rsquo;ll confirm your date of birth next.)</span></span>
        </label>
        {e.adult ? <p role="alert" className="text-sm text-alert">{e.adult}</p> : null}
        <label className="flex items-start gap-3 text-sm text-cocoa">
          <input type="checkbox" name="terms" className="mt-0.5 size-5 accent-clay" aria-invalid={!!e.terms} />
          <span>
            I agree to the <Link href="/terms" className="text-clay underline underline-offset-4">Terms</Link>, the{" "}
            <Link href="/privacy" className="text-clay underline underline-offset-4">Privacy Policy</Link> and the{" "}
            <Link href="/guidelines" className="text-clay underline underline-offset-4">Community guidelines</Link>.
          </span>
        </label>
        {e.terms ? <p role="alert" className="text-sm text-alert">{e.terms}</p> : null}
      </fieldset>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}
