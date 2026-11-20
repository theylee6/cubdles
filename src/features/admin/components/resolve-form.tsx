"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveReportAction } from "../actions";

const ACTIONS = [
  {
    value: "dismiss",
    label: "Dismiss",
    hint: "No rule broken. The reporter's block (if any) stays.",
  },
  {
    value: "warn",
    label: "Warn",
    hint: "They see a warning about the category of behaviour. Their account stays active.",
  },
  {
    value: "suspend",
    label: "Suspend",
    hint: "Account hidden and frozen until reviewed. Closes their other open reports.",
  },
  {
    value: "ban",
    label: "Ban",
    hint: "Permanent removal. Closes their other open reports.",
  },
] as const;
type Action = (typeof ACTIONS)[number]["value"];

export function ResolveForm({
  reportId,
  suggestFraud,
}: {
  reportId: string;
  suggestFraud: boolean;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [fraud, setFraud] = useState(suggestFraud);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!action) return setError("Choose an action.");
    const label = ACTIONS.find((a) => a.value === action)!.label;
    if (
      (action === "ban" || action === "suspend") &&
      !window.confirm(`${label} this member? This takes effect immediately.`)
    )
      return;
    start(async () => {
      const r = await resolveReportAction({ reportId, action, note, fraud });
      if (!r.ok) return setError(r.message);
      setError(null);
      setResult(`${label}: done.${r.message ? ` ${r.message}` : ""}`);
      router.refresh();
    });
  }

  if (result) {
    return (
      <p role="status" className="rounded-2xl bg-sage-soft px-4 py-3 text-sm">
        {result}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Decision</legend>
        {ACTIONS.map((a) => (
          <label
            key={a.value}
            className={cn(
              "flex cursor-pointer gap-3 rounded-2xl px-4 py-3 ring-1 ring-oat hover:bg-linen",
              action === a.value && "bg-linen ring-2 ring-clay",
            )}
          >
            <input
              type="radio"
              name="action"
              value={a.value}
              checked={action === a.value}
              onChange={() => setAction(a.value)}
              className="mt-1 accent-[var(--color-clay)]"
            />
            <span>
              <span className="block font-medium">{a.label}</span>
              <span className="block text-sm text-mocha">{a.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {action === "ban" ? (
        <label className="flex items-start gap-3 rounded-2xl bg-linen px-4 py-3 text-sm ring-1 ring-oat">
          <input
            type="checkbox"
            checked={fraud}
            onChange={(e) => setFraud(e.target.checked)}
            className="mt-1 accent-[var(--color-clay)]"
          />
          <span>
            <span className="block font-medium">
              This is a fraud ban (scam, false identity, asking for money)
            </span>
            Everyone who received a message from them gets the fraud-ban notice
            straight away (required by US law within 24 hours).
          </span>
        </label>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="font-medium">
          Reason / notes
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          className="rounded-2xl bg-cream px-4 py-3 text-[15px] ring-1 ring-oat outline-none focus:ring-2 focus:ring-clay"
          placeholder="What you saw and why you decided this. Stored in the audit log; not shown to members."
        />
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-2xl bg-blush-soft px-4 py-3 text-sm ring-1 ring-blush"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save decision"}
      </Button>
    </form>
  );
}
