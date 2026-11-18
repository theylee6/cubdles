import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] bg-linen/80 p-6 ring-1 ring-oat/70 shadow-[var(--shadow-card)]", className)}
      {...props}
    />
  );
}

export function Chip({
  className,
  selected,
  ...props
}: ComponentProps<"span"> & { selected?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm ring-1 transition-colors",
        selected ? "bg-blush text-cocoa ring-blush" : "bg-cream text-cocoa ring-oat",
        className,
      )}
      {...props}
    />
  );
}

/** Soft affection badge, e.g. "Little spoon" — sage fill with cocoa text (sage alone is too light for text). */
export function AffectionBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-cocoa", className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-sage" />
      {children}
    </span>
  );
}

export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-xs font-semibold uppercase tracking-[0.16em] text-clay", className)} {...props} />;
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-col gap-4", align === "center" && "items-center text-center")}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Tag className={cn("text-balance text-cocoa", Tag === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl")}>{title}</Tag>
      {intro ? <p className="max-w-2xl text-pretty text-lg leading-relaxed text-mocha">{intro}</p> : null}
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning";
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn(
        "rounded-2xl px-5 py-4 text-sm leading-relaxed ring-1",
        tone === "warning" ? "bg-blush-soft text-cocoa ring-blush" : "bg-sage-soft text-cocoa ring-sage/40",
        className,
      )}
    >
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-mocha">{children}</div> : null}
    </div>
  );
}
