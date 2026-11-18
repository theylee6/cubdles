"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/primitives";
import { requestPasswordResetAction, updatePasswordAction } from "@/lib/auth/actions";
import type { FormState } from "@/lib/auth/schemas";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordResetAction, {});
  const e = state.errors ?? {};
  if (state.ok) return <Notice title="Check your email">{state.message}</Notice>;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message ? <Notice tone="warning" title="Not sent">{state.message}</Notice> : null}
      <Field label="Email" htmlFor="email" error={e.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!e.email} aria-describedby={e.email ? "email-error" : undefined} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePasswordAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message ? <Notice tone="warning" title="Couldn't update">{state.message}</Notice> : null}
      <Field label="New password" htmlFor="password" error={e.password} hint="At least 10 characters, with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!e.password} aria-describedby={e.password ? "password-error" : "password-hint"} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={e.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!e.confirm} aria-describedby={e.confirm ? "confirm-error" : undefined} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
