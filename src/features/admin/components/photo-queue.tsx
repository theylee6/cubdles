"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moderatePhotoAction } from "../actions";
import type { PendingPhoto } from "../data";

export const REJECTION_REASONS = [
  "Not a clear photo of you",
  "Nudity or sexual content",
  "Shows a child or someone who may be under 18",
  "Violence, weapons or hate symbols",
  "Contact details, links or advertising",
  "Someone else's photo / stolen image",
] as const;

/** Approve or reject each pending photo. Decisions are audited in the database. */
export function PhotoQueue({ photos }: { photos: PendingPhoto[] }) {
  const [done, setDone] = useState<Record<string, "approved" | "rejected">>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function decide(id: string, approve: boolean) {
    const note = reason[id];
    if (!approve && !note) return setError("Choose a reason before rejecting.");
    start(async () => {
      const r = await moderatePhotoAction(
        id,
        approve,
        approve ? undefined : note,
      );
      if (!r.ok) return setError(r.message);
      setError(null);
      setDone((d) => ({ ...d, [id]: approve ? "approved" : "rejected" }));
    });
  }

  if (!photos.length)
    return (
      <p className="rounded-[var(--radius-card)] bg-linen px-5 py-10 text-center text-mocha ring-1 ring-oat">
        No photos waiting. Nice.
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
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p) => (
          <li
            key={p.id}
            className="flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-cream ring-1 ring-oat"
          >
            <div className="aspect-[4/5] bg-linen">
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.url}
                  alt={`Photo uploaded by ${p.name}`}
                  className="size-full object-cover"
                />
              ) : (
                <p className="p-4 text-sm text-mocha">Image unavailable</p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <p className="text-sm">
                <span className="font-medium">{p.name}</span>{" "}
                <span className="text-mocha">· {p.profileStatus}</span>
              </p>
              {done[p.id] ? (
                <p
                  role="status"
                  className="rounded-2xl bg-linen px-3 py-2 text-sm"
                >
                  {done[p.id] === "approved" ? "Approved" : "Rejected"}
                </p>
              ) : (
                <>
                  <label className="sr-only" htmlFor={`reason-${p.id}`}>
                    Rejection reason
                  </label>
                  <select
                    id={`reason-${p.id}`}
                    value={reason[p.id] ?? ""}
                    onChange={(e) =>
                      setReason((r) => ({ ...r, [p.id]: e.target.value }))
                    }
                    className="h-10 rounded-2xl bg-cream px-3 text-sm ring-1 ring-oat"
                  >
                    <option value="">Reason if rejecting…</option>
                    {REJECTION_REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => decide(p.id, false)}
                    >
                      <X className="size-4" aria-hidden /> Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => decide(p.id, true)}
                    >
                      <Check className="size-4" aria-hidden /> Approve
                    </Button>
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
