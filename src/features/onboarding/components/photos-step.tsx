"use client";

import { useState } from "react";
import { useActionForm } from "@/components/ui/use-action-form";
import type { FormState } from "@/lib/auth/schemas";
import { PhotoManager } from "@/features/photos/photo-manager";
import { continueFromPhotos } from "../actions";
import type { OwnPhoto } from "../data";
import { Continue } from "./simple-steps";
import { FormMessage } from "./step-shell";

export function PhotosStep({ photos }: { photos: OwnPhoto[] }) {
  const { state, pending, formProps } = useActionForm<FormState>(continueFromPhotos);
  const [count, setCount] = useState(photos.filter((p) => p.moderationStatus !== "rejected").length);

  return (
    <div className="flex flex-col gap-6">
      <PhotoManager initialPhotos={photos} onChange={(p) => setCount(p.filter((x) => x.moderationStatus !== "rejected").length)} />
      <form {...formProps} className="flex flex-col gap-3">
        <FormMessage message={state.message} />
        {count < 2 ? <p className="text-sm text-mocha">Add {2 - count} more to continue.</p> : null}
        <div>
          <Continue pending={pending} />
        </div>
      </form>
    </div>
  );
}
