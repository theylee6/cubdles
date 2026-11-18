/**
 * Line illustrations in one consistent style: 1.75px cocoa strokes, a single peach or blush fill.
 * Decorative — hidden from assistive tech unless a label is passed.
 */
type Props = { className?: string; label?: string };

const stroke = { stroke: "#2E2522", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const line = { ...stroke, fill: "none" };

function a11y(label?: string) {
  return label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
}

/** Two people under one blanket on a sofa, a mug and a lamp. */
export function SofaScene({ className, label }: Props) {
  return (
    <svg viewBox="0 0 480 360" className={className} {...a11y(label)}>
      <ellipse cx="240" cy="318" rx="200" ry="14" fill="#EBC9BD" opacity="0.5" />
      {/* lamp */}
      <path d="M392 120 h48 l-10 -40 h-28 z" fill="#F6E4DC" {...stroke} />
      <path d="M416 120 v176 M396 296 h40" {...line} />
      {/* sofa */}
      <path d="M60 200 q0 -40 40 -40 h220 q40 0 40 40 v30" fill="#F3ECE3" {...stroke} />
      <path d="M40 230 q0 -24 24 -24 q24 0 24 24 v50 h-48 z" fill="#F3ECE3" {...stroke} />
      <path d="M352 230 q0 -24 24 -24 q24 0 24 24 v50 h-48 z" fill="#F3ECE3" {...stroke} />
      <path d="M88 250 h264 v30 h-264 z" fill="#F3ECE3" {...stroke} />
      <path d="M60 280 v18 M380 280 v18" {...line} />
      {/* two heads leaning together */}
      <circle cx="200" cy="154" r="22" fill="#FBF7F2" {...stroke} />
      <circle cx="244" cy="151" r="22" fill="#FBF7F2" {...stroke} />
      <path d="M180 146 q10 -24 38 -18" {...line} />
      <path d="M228 135 q20 -14 36 4 q4 10 0 20" {...line} />
      <path d="M193 158 q6 4 12 0 M238 155 q6 4 12 0" {...line} />
      {/* blanket */}
      <path d="M140 190 q100 -30 200 0 l12 64 q-110 24 -224 0 z" fill="#F2BFA4" {...stroke} />
      <path d="M170 196 l-8 52 M210 188 l-4 64 M250 186 l2 66 M290 190 l8 60" stroke="#2E2522" strokeWidth="1" opacity="0.35" fill="none" />
      {/* mug on the floor */}
      <path d="M96 296 h26 v-24 h-26 z" fill="#FBF7F2" {...stroke} />
      <path d="M122 278 q10 0 10 7 q0 7 -10 7" {...line} />
      <path d="M104 262 q-4 -6 0 -12 M114 262 q-4 -6 0 -12" stroke="#2E2522" strokeWidth="1.25" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

export function MugIllustration({ className, label }: Props) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...a11y(label)}>
      <ellipse cx="58" cy="100" rx="40" ry="6" fill="#EBC9BD" opacity="0.6" />
      <path d="M30 46 h52 v38 q0 14 -14 14 h-24 q-14 0 -14 -14 z" fill="#F2BFA4" {...stroke} />
      <path d="M82 56 q16 0 16 13 q0 13 -16 13" {...line} />
      <path d="M46 34 q-6 -8 0 -16 M58 34 q-6 -8 0 -16 M70 34 q-6 -8 0 -16" stroke="#2E2522" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M52 68 q6 -6 12 0 q-6 8 -6 10 q0 -2 -6 -10z" fill="#A04F37" />
    </svg>
  );
}

export function PillowsIllustration({ className, label }: Props) {
  return (
    <svg viewBox="0 0 160 110" className={className} {...a11y(label)}>
      <ellipse cx="80" cy="96" rx="64" ry="7" fill="#EBC9BD" opacity="0.6" />
      <path d="M20 44 q-6 -22 18 -24 q36 -4 56 4 q16 8 6 30 q6 26 -18 28 q-36 4 -56 -4 q-16 -8 -6 -34z" fill="#F3ECE3" {...stroke} />
      <path d="M62 50 q-6 -22 18 -24 q36 -4 56 4 q16 8 6 30 q6 26 -18 28 q-36 4 -56 -4 q-16 -8 -6 -34z" fill="#F2BFA4" {...stroke} />
    </svg>
  );
}

export function ShieldIllustration({ className, label }: Props) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...a11y(label)}>
      <ellipse cx="60" cy="104" rx="36" ry="5" fill="#EBC9BD" opacity="0.6" />
      <path d="M60 14 l36 12 v28 q0 30 -36 44 q-36 -14 -36 -44 v-28 z" fill="#E3E8DE" {...stroke} />
      <path d="M44 56 l11 11 l22 -24" stroke="#2E2522" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function EnvelopeIllustration({ className, label }: Props) {
  return (
    <svg viewBox="0 0 140 110" className={className} {...a11y(label)}>
      <ellipse cx="70" cy="98" rx="48" ry="6" fill="#EBC9BD" opacity="0.6" />
      <rect x="22" y="28" width="96" height="62" rx="10" fill="#F3ECE3" {...stroke} />
      <path d="M26 34 l44 32 l44 -32" {...line} />
      <path d="M66 18 q4 -8 10 -4 q6 4 -10 16 q-16 -12 -10 -16 q6 -4 10 4z" fill="#F2BFA4" {...stroke} />
    </svg>
  );
}
