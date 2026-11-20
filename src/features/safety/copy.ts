import type { Enums } from "@/lib/supabase/database.types";

export type ReportReason = Enums<"report_reason">;

export const REPORT_REASONS: {
  value: ReportReason;
  label: string;
  hint: string;
}[] = [
  {
    value: "fake_profile",
    label: "Fake profile or pretending to be someone",
    hint: "Photos or details that aren't theirs",
  },
  {
    value: "scam",
    label: "Scam or asking for money",
    hint: "Money, gift cards, crypto, investments, or moving off the app quickly",
  },
  {
    value: "harassment",
    label: "Harassment or unwanted sexual messages",
    hint: "Pressure, threats, or messages you didn't want",
  },
  {
    value: "inappropriate_content",
    label: "Inappropriate photos or content",
    hint: "Nudity, violence or anything that shouldn't be here",
  },
  {
    value: "hate",
    label: "Hate or discrimination",
    hint: "Slurs or attacks on who someone is",
  },
  {
    value: "underage",
    label: "They may be under 18",
    hint: "We review these first",
  },
  {
    value: "offline_safety",
    label: "Something happened when we met",
    hint: "We review these first. If you're in danger, call your local emergency number.",
  },
  {
    value: "spam",
    label: "Spam or advertising",
    hint: "Links, promotions or copy-paste messages",
  },
  { value: "other", label: "Something else", hint: "Tell us what happened" },
];

export function reasonLabel(reason: ReportReason | null | undefined): string {
  return (
    REPORT_REASONS.find((r) => r.value === reason)?.label ?? "Something else"
  );
}

const ERRORS: Record<string, string> = {
  not_found: "We couldn't find that person.",
  invalid_report:
    "Something about that report didn't add up. Please try again.",
  rate_limited:
    "You've sent a lot of reports today. Please contact us if this is urgent.",
  details_required: "Please tell us a little about what happened.",
  details_too_long: "Please keep the details under 1,000 characters.",
  not_authenticated: "Please log in again.",
};

export function reportErrorKey(raw: string | null | undefined): string {
  return Object.keys(ERRORS).find((k) => (raw ?? "").includes(k)) ?? "unknown";
}

export function reportErrorText(code: string): string {
  return (
    ERRORS[code] ?? "We couldn't send your report just now. Please try again."
  );
}

/** What a warned member is told. Neutral, specific to the category, never names who reported. */
export function warningText(reason: ReportReason | null | undefined): string {
  const what: Partial<Record<ReportReason, string>> = {
    harassment: "messages that made someone uncomfortable",
    inappropriate_content: "content that breaks our rules",
    hate: "language that attacks people for who they are",
    spam: "spam or advertising",
    scam: "asking for money or financial help",
    fake_profile: "details or photos that may not be yours",
  };
  return `We received a report about ${what[reason ?? "other"] ?? "behaviour that goes against our community guidelines"}. Please read the guidelines; another report could mean your account is suspended.`;
}

/** Romance Scam Prevention Act (15 U.S.C. 45g) fraud-ban notification text. */
export const FRAUD_BAN_ADVICE = {
  identity:
    "They may have been using a false identity or trying to defraud other members.",
  money:
    "Never send money, gift cards, crypto or any other kind of payment to someone you met on Cubdles, and never share bank, card or other financial details.",
  help: "If you've already sent money or shared financial details, contact your bank straight away and report it to the police. If they contacted you outside Cubdles, stop replying.",
};
export const FTC_ROMANCE_SCAMS_URL =
  "https://consumer.ftc.gov/articles/what-know-about-romance-scams";
