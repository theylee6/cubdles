"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { OwnPhoto } from "@/features/onboarding/data";
import { cn } from "@/lib/utils";
import { deletePhoto, reorderPhotos, uploadPhoto, type PhotoActionResult } from "./actions";
import { prepareImageForUpload } from "./client-resize";

export const MAX_PHOTOS = 6;

const STATUS_LABEL: Record<OwnPhoto["moderationStatus"], string> = {
  pending: "In review",
  approved: "Approved",
  rejected: "Not approved",
};

/**
 * Upload, reorder and delete profile photos. Reused by onboarding and (later) profile editing.
 * Reordering uses buttons rather than drag-and-drop so it works with keyboard and screen readers;
 * a drag layer can be added on top later without changing the actions.
 */
export function PhotoManager({ initialPhotos, onChange }: { initialPhotos: OwnPhoto[]; onChange?: (photos: OwnPhoto[]) => void }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function apply(result: PhotoActionResult) {
    if (result.ok) {
      setPhotos(result.photos);
      onChange?.(result.photos);
      setMessage(null);
    } else {
      setMessage(result.message);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const chosen = Array.from(files).slice(0, room);
    if (files.length > room) setMessage(`Only ${room} more photo${room === 1 ? "" : "s"} can be added.`);
    setUploading(true);
    try {
      for (const file of chosen) {
        let blob: Blob;
        try {
          blob = await prepareImageForUpload(file);
        } catch (err) {
          setMessage((err as Error).message);
          continue;
        }
        const fd = new FormData();
        fd.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        apply(await uploadPhoto(fd));
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const ids = photos.map((p) => p.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    // Optimistic reorder; the server response replaces it.
    setPhotos((prev) => ids.map((id) => prev.find((p) => p.id === id)!));
    startTransition(async () => apply(await reorderPhotos(ids)));
  }

  function remove(id: string) {
    if (!window.confirm("Remove this photo?")) return;
    startTransition(async () => apply(await deletePhoto(id)));
  }

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null);
  const working = busy || uploading;

  return (
    <div className="flex flex-col gap-4">
      {message ? (
        <p role="alert" className="rounded-2xl bg-blush-soft px-4 py-3 text-sm ring-1 ring-blush">
          {message}
        </p>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Your photos">
        {slots.map((photo, i) =>
          photo ? (
            <li key={photo.id} className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-linen ring-1 ring-oat">
              {photo.url ? (
                // Signed, short-lived URLs from private storage; next/image optimisation is added with the image CDN in M8.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={`Your photo ${i + 1}`} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-mocha">Preview unavailable</div>
              )}
              <span
                className={cn(
                  "absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-medium",
                  photo.moderationStatus === "rejected" ? "bg-alert text-white" : "bg-cream/90 text-cocoa",
                )}
              >
                {i === 0 ? "Main · " : ""}
                {STATUS_LABEL[photo.moderationStatus]}
              </span>
              <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
                <div className="flex gap-1">
                  <IconButton label={`Move photo ${i + 1} earlier`} disabled={i === 0 || working} onClick={() => move(i, -1)}>
                    <ArrowLeft className="size-4" />
                  </IconButton>
                  <IconButton label={`Move photo ${i + 1} later`} disabled={i === photos.length - 1 || working} onClick={() => move(i, 1)}>
                    <ArrowRight className="size-4" />
                  </IconButton>
                </div>
                <IconButton label={`Remove photo ${i + 1}`} disabled={working} onClick={() => remove(photo.id)}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </li>
          ) : (
            <li key={`empty-${i}`} className="aspect-[4/5]">
              {i === photos.length ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={working}
                  className="flex size-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-oat bg-cream text-mocha transition-colors hover:border-clay hover:text-clay disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <ImagePlus className="size-6" aria-hidden />}
                  <span className="text-sm font-medium">{uploading ? "Uploading…" : "Add photo"}</span>
                </button>
              ) : (
                <div aria-hidden className="size-full rounded-[var(--radius-card)] border-2 border-dashed border-oat/60" />
              )}
            </li>
          ),
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="sr-only"
        aria-label="Choose photos to upload"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-sm text-mocha">
        Clear photos of you, on your own in at least one. No nudity, other people&rsquo;s children, or contact details. We
        remove location data from every photo. If you&rsquo;re verified, adding a photo removes the badge until you verify again.
      </p>
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-full bg-cream/90 text-cocoa shadow-sm hover:bg-cream disabled:opacity-40"
    >
      {children}
    </button>
  );
}
