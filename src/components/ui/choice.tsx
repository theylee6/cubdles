"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Selection controls built on native radio/checkbox inputs, so they submit with
 * plain <form> + server actions, work without JS and are keyboard/screen-reader friendly.
 * Visual styling lives only in the class strings — swap them for Figma styles later.
 */

export type Option<V extends string = string> = { value: V; label: string; description?: string };

const chip =
  "relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[15px] ring-1 ring-oat bg-cream text-cocoa transition-colors hover:bg-linen has-[:checked]:bg-blush has-[:checked]:ring-blush has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";

const card =
  "relative flex cursor-pointer flex-col gap-1 rounded-2xl px-5 py-4 ring-1 ring-oat bg-cream text-cocoa transition-colors hover:bg-linen has-[:checked]:bg-blush-soft has-[:checked]:ring-2 has-[:checked]:ring-clay has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay";

type GroupProps = {
  legend: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
  srOnlyLegend?: boolean;
};

export function ChoiceFieldset({ legend, hint, error, children, className, srOnlyLegend }: GroupProps) {
  return (
    <fieldset className={cn("flex flex-col gap-3", className)} aria-invalid={error ? true : undefined}>
      <legend className={cn("mb-1 text-sm font-medium text-cocoa", srOnlyLegend && "sr-only")}>{legend}</legend>
      {hint ? <p className="-mt-2 text-sm text-mocha">{hint}</p> : null}
      {children}
      {error ? (
        <p role="alert" className="text-sm text-alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Single choice as chips (layout="chips") or larger cards with descriptions (layout="cards"). */
export function RadioChoices<V extends string>({
  name,
  options,
  defaultValue,
  layout = "chips",
  required,
}: {
  name: string;
  options: Option<V>[];
  defaultValue?: V | null;
  layout?: "chips" | "cards";
  required?: boolean;
}) {
  return (
    <div className={layout === "chips" ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-2"}>
      {options.map((o) => (
        <label key={o.value} className={layout === "chips" ? chip : card}>
          <input type="radio" name={name} value={o.value} defaultChecked={defaultValue === o.value} required={required} className="sr-only" />
          <span className={layout === "cards" ? "font-medium" : undefined}>{o.label}</span>
          {layout === "cards" && o.description ? <span className="text-sm text-mocha">{o.description}</span> : null}
        </label>
      ))}
    </div>
  );
}

/** Multiple choice chips with an optional maximum (extra options disable once the max is reached). */
export function CheckboxChips<V extends string>({
  name,
  options,
  defaultValues = [],
  max,
}: {
  name: string;
  options: Option<V>[];
  defaultValues?: readonly V[];
  max?: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultValues));
  const full = max !== undefined && selected.size >= max;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const checked = selected.has(o.value);
        return (
          <label key={o.value} className={chip}>
            <input
              type="checkbox"
              name={name}
              value={o.value}
              checked={checked}
              disabled={!checked && full}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(o.value);
                else next.delete(o.value);
                setSelected(next);
              }}
              className="sr-only"
            />
            {o.label}
          </label>
        );
      })}
      {max !== undefined ? (
        <p className="w-full text-sm text-mocha" aria-live="polite">
          {selected.size} of {max} chosen
        </p>
      ) : null}
    </div>
  );
}

/** 1–5 scale with end labels, e.g. "Take it slow" … "Love it". */
export function ScaleChoice({
  name,
  defaultValue,
  lowLabel,
  highLabel,
}: {
  name: string;
  defaultValue?: number | null;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={cn(chip, "justify-center px-0")}>
            <input type="radio" name={name} value={n} defaultChecked={defaultValue === n} className="sr-only" />
            <span aria-hidden>{n}</span>
            <span className="sr-only">
              {n} of 5{n === 1 ? ` — ${lowLabel}` : n === 5 ? ` — ${highLabel}` : ""}
            </span>
          </label>
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-xs text-mocha">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
