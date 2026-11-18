"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/primitives";
import { useActionForm } from "@/components/ui/use-action-form";
import type { FormState } from "@/lib/auth/schemas";
import { requestDeletion, savePrivacy, setIncognito, setPaused } from "./actions";

type Privacy = {
  show_online_status: boolean;
  show_last_active: boolean;
  send_read_receipts: boolean;
  hide_age: boolean;
  hide_distance: boolean;
};

const PRIVACY_FIELDS: { key: keyof Privacy; label: string; hint: string }[] = [
  { key: "show_online_status", label: "Show when I'm online", hint: "Matches see a dot when you're using Cubdles." },
  { key: "show_last_active", label: "Show when I was last active", hint: "Shown as “Active today” or “this week”, never an exact time." },
  { key: "send_read_receipts", label: "Send read receipts", hint: "Matches see when you've read their messages." },
  { key: "hide_age", label: "Hide my age", hint: "Your age still decides who can see you." },
  { key: "hide_distance", label: "Hide my distance", hint: "People won't see how far away you are." },
];

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-mocha">{hint}</span>
      </span>
      <input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} className="mt-1 size-5 shrink-0 accent-clay" />
    </label>
  );
}

export function PrivacyForm({ initial }: { initial: Privacy }) {
  const { state, pending, formProps } = useActionForm<FormState>(savePrivacy);
  return (
    <form {...formProps} className="flex flex-col">
      <div className="divide-y divide-oat">
        {PRIVACY_FIELDS.map((f) => (
          <Toggle key={f.key} name={f.key} label={f.label} hint={f.hint} defaultChecked={initial[f.key]} />
        ))}
      </div>
      {state.message ? <p role="status" className="mt-2 text-sm text-mocha">{state.message}</p> : null}
      <div className="mt-4">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save privacy settings"}</Button>
      </div>
    </form>
  );
}

/** A single on/off control backed by a server action (pause, incognito). */
export function ActionSwitch({
  label,
  hint,
  initial,
  action,
  disabledReason,
}: {
  label: string;
  hint: string;
  initial: boolean;
  action: "pause" | "incognito";
  disabledReason?: string;
}) {
  const [on, setOn] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1 py-3">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span>
          <span className="block font-medium">{label}</span>
          <span className="block text-sm text-mocha">{disabledReason ?? hint}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={on}
          disabled={pending || Boolean(disabledReason)}
          onChange={(e) => {
            const next = e.target.checked;
            start(async () => {
              const r = action === "pause" ? await setPaused(next) : await setIncognito(next);
              if (r.ok) setOn(next);
              setMessage(r.message ?? null);
            });
          }}
          className="mt-1 size-5 shrink-0 accent-clay disabled:opacity-50"
        />
      </label>
      {message ? <p role="status" className="text-sm text-mocha">{message}</p> : null}
    </div>
  );
}

export function DeleteAccountForm() {
  const { state, pending, formProps } = useActionForm<FormState>(requestDeletion);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="self-start">
        Delete my account…
      </Button>
    );
  }
  return (
    <form {...formProps} className="flex flex-col gap-4">
      <Notice tone="warning" title="Before you go">
        Your profile disappears straight away and your matches end. Everything is permanently deleted after 30 days;
        log back in before then if you change your mind. Some records are kept where the law requires.
      </Notice>
      {state.message ? <p role="alert" className="text-sm text-alert">{state.message}</p> : null}
      <Field label="Type DELETE to confirm" htmlFor="confirm" error={state.errors?.confirm}>
        <Input id="confirm" name="confirm" autoComplete="off" aria-invalid={state.errors?.confirm ? true : undefined} />
      </Field>
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Deleting…" : "Delete my account"}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
