"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reportAction } from "../actions";
import { REPORT_REASONS, type ReportReason } from "../copy";

type Props = {
  reportedId: string;
  name: string;
  matchId?: string;
  /** Where to go after report-and-block (they disappear from the current page). */
  afterBlockHref?: string;
  triggerVariant?: "secondary" | "ghost";
  triggerSize?: "sm" | "md";
  compact?: boolean;
};

/** "Report" button + dialog: reason, optional details, and (by default) block at the same time. */
export function ReportButton({
  reportedId,
  name,
  matchId,
  afterBlockHref = "/app/discover",
  triggerVariant = "secondary",
  triggerSize = "md",
  compact,
}: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  const [error, setError] = useState<{
    message: string;
    field?: string;
  } | null>(null);
  const [done, setDone] = useState<{ blocked: boolean } | null>(null);
  const [pending, start] = useTransition();

  function open() {
    setReason(null);
    setDetails("");
    setBlock(true);
    setError(null);
    setDone(null);
    ref.current?.showModal();
  }

  function close() {
    ref.current?.close();
    if (done?.blocked) router.push(afterBlockHref);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason)
      return setError({ message: "Choose what happened.", field: "reason" });
    start(async () => {
      const r = await reportAction({
        reportedId,
        reason,
        details: details || undefined,
        matchId,
        block,
      });
      if (!r.ok) return setError({ message: r.message, field: r.field });
      setError(null);
      setDone({ blocked: r.blocked });
    });
  }

  const urgent = reason === "underage" || reason === "offline_safety";

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        onClick={open}
        aria-label={compact ? `Report ${name}` : undefined}
      >
        <Flag className="size-4" aria-hidden />
        <span className={compact ? "hidden sm:inline" : undefined}>Report</span>
      </Button>

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => done?.blocked && router.push(afterBlockHref)}
        className="m-auto max-h-[90dvh] w-[min(94vw,480px)] overflow-y-auto rounded-[var(--radius-sheet)] bg-cream p-0 text-cocoa shadow-[var(--shadow-float)] backdrop:bg-cocoa/40 backdrop:backdrop-blur-sm"
      >
        {done ? (
          <div className="flex flex-col gap-4 p-6">
            <h2 id={titleId} className="text-2xl">
              Thank you for telling us
            </h2>
            <p className="text-mocha">
              Our team will review your report. We won&rsquo;t tell {name} who
              reported them.
              {done.blocked
                ? ` You've blocked ${name}, so you won't see each other again.`
                : ""}
            </p>
            <p className="text-sm text-mocha">
              If you&rsquo;re in danger right now, call your local emergency
              number.
            </p>
            <Button onClick={close}>Done</Button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="flex flex-col gap-5 p-6"
            noValidate
          >
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-2xl">
                Report {name}
              </h2>
              <p className="text-sm text-mocha">
                Reports are confidential. Choose what&rsquo;s closest to what
                happened.
              </p>
            </div>

            <fieldset
              className="flex flex-col gap-2"
              aria-describedby={
                error?.field === "reason" ? "report-reason-error" : undefined
              }
            >
              <legend className="sr-only">What happened?</legend>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-2xl px-4 py-3 ring-1 ring-oat hover:bg-linen",
                    reason === r.value && "bg-linen ring-2 ring-clay",
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="mt-1 accent-[var(--color-clay)]"
                  />
                  <span>
                    <span className="block text-[15px] font-medium">
                      {r.label}
                    </span>
                    <span className="block text-sm text-mocha">{r.hint}</span>
                  </span>
                </label>
              ))}
              {error?.field === "reason" ? (
                <p id="report-reason-error" className="text-sm text-alert">
                  {error.message}
                </p>
              ) : null}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-details" className="text-sm font-medium">
                What happened?{" "}
                {reason === "other" ? "(required)" : "(optional)"}
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={3}
                aria-invalid={error?.field === "details"}
                aria-describedby={
                  error?.field === "details"
                    ? "report-details-error"
                    : undefined
                }
                className="rounded-2xl bg-cream px-4 py-3 text-[15px] ring-1 ring-oat outline-none focus:ring-2 focus:ring-clay"
              />
              {error?.field === "details" ? (
                <p id="report-details-error" className="text-sm text-alert">
                  {error.message}
                </p>
              ) : null}
            </div>

            {urgent ? (
              <p className="rounded-2xl bg-blush-soft px-4 py-3 text-sm ring-1 ring-blush">
                We review these reports first. If you&rsquo;re in danger right
                now, call your local emergency number.
              </p>
            ) : null}

            <label className="flex items-start gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={block}
                onChange={(e) => setBlock(e.target.checked)}
                className="mt-1 accent-[var(--color-clay)]"
              />
              <span>
                Also block {name}
                <span className="block text-sm text-mocha">
                  You&rsquo;ll be hidden from each other and any conversation
                  will close.
                </span>
              </span>
            </label>

            {error && !error.field ? (
              <p
                role="alert"
                className="rounded-2xl bg-blush-soft px-4 py-3 text-sm ring-1 ring-blush"
              >
                {error.message}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => ref.current?.close()}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Sending…" : "Send report"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
