import Link from "next/link";
import { Notice } from "@/components/ui/primitives";
import type { SafetyAdvisory } from "./safety-advisory-data";

/** Shown to members in countries where same-sex relationships are criminalised. */
export function SafetyAdvisoryNotice({
  advisory,
  className,
}: {
  advisory: SafetyAdvisory | null;
  className?: string;
}) {
  if (!advisory) return null;
  return (
    <Notice
      tone="warning"
      title={`Take extra care in ${advisory.countryName}`}
      className={className}
    >
      Same-sex relationships are criminalised in {advisory.countryName}. Think
      about what your photos and prompts reveal, keep conversations on Cubdles
      until you trust someone, and meet in safe public places. Incognito is free
      for you here, so only people you&rsquo;ve liked can see you.{" "}
      <Link href="/app/settings" className="underline underline-offset-4">
        Turn on Incognito
      </Link>{" "}
      ·{" "}
      <Link
        href="/safety#travel-and-local-laws"
        className="underline underline-offset-4"
      >
        Safety tips
      </Link>
    </Notice>
  );
}
