"use client";

import { useActionState } from "react";
import { withRecovery } from "@/components/ui/action-recovery";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/primitives";
import type { FormState } from "@/lib/auth/schemas";
import { sendContactMessage } from "./actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    withRecovery(sendContactMessage),
    {},
  );
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.ok) {
    return <Notice title="Message sent">{state.message}</Notice>;
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message ? (
        <Notice tone="warning" title="Not sent">
          {state.message}
        </Notice>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" error={e.name}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={v.name}
            required
            aria-invalid={!!e.name}
            aria-describedby={e.name ? "name-error" : undefined}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={e.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={v.email}
            required
            aria-invalid={!!e.email}
            aria-describedby={e.email ? "email-error" : undefined}
          />
        </Field>
      </div>
      <Field label="What's it about?" htmlFor="topic">
        <Select id="topic" name="topic" defaultValue={v.topic ?? "general"}>
          <option value="general">General question</option>
          <option value="safety">Safety concern</option>
          <option value="billing">Membership or billing</option>
          <option value="privacy">Privacy or my data</option>
          <option value="press">Press</option>
        </Select>
      </Field>
      <Field label="Message" htmlFor="message" error={e.message}>
        <Textarea
          id="message"
          name="message"
          rows={6}
          defaultValue={v.message}
          required
          aria-invalid={!!e.message}
          aria-describedby={e.message ? "message-error" : undefined}
        />
      </Field>
      {/* Honeypot for bots — hidden from people and assistive tech. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
