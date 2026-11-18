import { cn } from "@/lib/utils";

/**
 * The Cubdles wordmark. Pronounced "cuddles" — the b and d lean in toward each other
 * like two people curled up, so the cuddle is built into the name. Never "correct" the spelling.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-display inline-flex items-baseline text-[1.6rem] font-semibold leading-none text-cocoa", className)}
      aria-label="Cubdles"
      role="img"
    >
      <span aria-hidden>Cu</span>
      <span aria-hidden className="inline-flex text-clay" style={{ letterSpacing: "-0.06em" }}>
        <span className="inline-block origin-bottom rotate-[7deg]">b</span>
        <span className="inline-block origin-bottom -rotate-[7deg]">d</span>
      </span>
      <span aria-hidden>les</span>
    </span>
  );
}

/** The bd mark on its own: two rounded figures whose "bowls" meet. Used for the app icon and the match moment. */
export function BdMark({ className, title = "Cubdles" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
      <g transform="rotate(7 22 50)">
        <rect x="8.5" y="8" width="7" height="44" rx="3.5" fill="#A04F37" />
        <circle cx="21" cy="40.5" r="9" fill="none" stroke="#A04F37" strokeWidth="7" />
      </g>
      <g transform="rotate(-7 42 50)">
        <rect x="48.5" y="8" width="7" height="44" rx="3.5" fill="#E0937A" />
        <circle cx="43" cy="40.5" r="9" fill="none" stroke="#E0937A" strokeWidth="7" />
      </g>
    </svg>
  );
}
