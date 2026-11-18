"use client";

import { useState } from "react";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useActionForm } from "@/components/ui/use-action-form";
import type { FormState } from "@/lib/auth/schemas";
import { savePrompts } from "../actions";
import { Continue } from "./simple-steps";
import { FormMessage } from "./step-shell";

type Slot = { promptId: string; answer: string };

export function PromptsStep({
  catalogue,
  answers,
}: {
  catalogue: { id: number; text: string }[];
  answers: { promptId: number; answer: string }[];
}) {
  const { state, pending, formProps } = useActionForm<FormState>(savePrompts);
  const [slots, setSlots] = useState<Slot[]>(() =>
    Array.from({ length: 3 }, (_, i) => ({
      promptId: answers[i] ? String(answers[i].promptId) : "",
      answer: answers[i]?.answer ?? "",
    })),
  );
  const e = state.errors ?? {};

  const update = (i: number, patch: Partial<Slot>) => setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const takenElsewhere = (i: number) => new Set(slots.filter((_, j) => j !== i).map((s) => s.promptId).filter(Boolean));

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormMessage message={state.message ?? e.answers} />
      {slots.map((slot, i) => {
        const taken = takenElsewhere(i);
        return (
          <fieldset key={i} className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-linen/70 p-5 ring-1 ring-oat">
            <legend className="sr-only">Prompt {i + 1}</legend>
            <Field label={i === 0 ? "Prompt" : `Prompt ${i + 1} (optional)`} htmlFor={`promptId-${i}`}>
              <Select id={`promptId-${i}`} name={`promptId-${i}`} value={slot.promptId} onChange={(ev) => update(i, { promptId: ev.target.value })}>
                <option value="">Choose a prompt</option>
                {catalogue.map((p) => (
                  <option key={p.id} value={p.id} disabled={taken.has(String(p.id))}>
                    {p.text}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Your answer" htmlFor={`answer-${i}`} hint={`${slot.answer.length}/200`}>
              <Textarea
                id={`answer-${i}`}
                name={`answer-${i}`}
                rows={3}
                maxLength={200}
                value={slot.answer}
                disabled={!slot.promptId}
                onChange={(ev) => update(i, { answer: ev.target.value })}
                placeholder={slot.promptId ? "Keep it short and true to you." : "Choose a prompt first."}
              />
            </Field>
          </fieldset>
        );
      })}
      <Continue pending={pending} />
    </form>
  );
}
