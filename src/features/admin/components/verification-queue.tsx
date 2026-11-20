"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { poseText } from "@/features/verification/copy";
import { decideVerificationAction } from "../actions";
import type { PendingVerification } from "../data";

const REASONS = [
  "Face doesn't match the profile photos",
  "Pose not copied",
  "Face not clearly visible",
  "Not a live photo (screen or printed photo)",
] as const;

export function VerificationQueue({ items }: { items: PendingVerification[] }) {
  const [done, setDone] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function decide(id: string, approve: boolean) {
    if (!approve && !reason[id])
      return setError("Choose a reason before rejecting.");
    start(async () => {
      const r = await decideVerificationAction(
        id,
        approve,
        approve ? undefined : reason[id],
      );
      if (!r.ok) return setError(r.message);
      setError(null);
      setDone((d) => ({ ...d, [id]: approve ? "Verified" : "Rejected" }));
    });
  }

  if (!items.length)
    return (
      <p className="rounded-[var(--radius-card)] bg-linen px-5 py-10 text-center text-mocha ring-1 ring-oat">
        No selfies waiting.
      </p>
    );

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-2xl bg-blush-soft px-4 py-3 text-sm ring-1 ring-blush"
        >
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {items.map((v) => (
          <li
            key={v.id}
            className="rounded-[var(--radius-card)] bg-cream p-4 ring-1 ring-oat"
          >
            <p className="mb-3 text-sm">
              <span className="font-medium">{v.name}</span> · asked to do:{" "}
              <strong>{poseText(v.pose).label}</strong> ({poseText(v.pose).how})
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <figure className="w-40 shrink-0">
                <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-linen ring-2 ring-clay">
                  {v.selfieUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.selfieUrl}
                      alt={`Verification selfie from ${v.name}`}
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <figcaption className="mt-1 text-xs text-mocha">
                  Selfie
                </figcaption>
              </figure>
              {v.photoUrls.map((u, i) => (
                <figure key={u} className="w-32 shrink-0">
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-linen">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt={`Profile photo ${i + 1}`}
                      className="size-full object-cover"
                    />
                  </div>
                  <figcaption className="mt-1 text-xs text-mocha">
                    Profile photo {i + 1}
                  </figcaption>
                </figure>
              ))}
            </div>
            {done[v.id] ? (
              <p
                role="status"
                className="mt-2 rounded-2xl bg-linen px-3 py-2 text-sm"
              >
                {done[v.id]}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label htmlFor={`vr-${v.id}`} className="sr-only">
                  Rejection reason
                </label>
                <select
                  id={`vr-${v.id}`}
                  value={reason[v.id] ?? ""}
                  onChange={(e) =>
                    setReason((r) => ({ ...r, [v.id]: e.target.value }))
                  }
                  className="h-10 rounded-2xl bg-cream px-3 text-sm ring-1 ring-oat"
                >
                  <option value="">Reason if rejecting…</option>
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => decide(v.id, false)}
                >
                  <X className="size-4" aria-hidden /> Reject
                </Button>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => decide(v.id, true)}
                >
                  <Check className="size-4" aria-hidden /> Verify
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
