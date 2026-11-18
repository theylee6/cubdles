import { countryName } from "@/features/onboarding/options";

export type SafetyAdvisory = {
  kind: "same_sex_criminalised";
  countryCode: string;
  countryName: string;
};

export function parseSafetyAdvisory(raw: unknown): SafetyAdvisory | null {
  if (!raw || typeof raw !== "object") return null;
  const { country_code, advisory } = raw as {
    country_code?: unknown;
    advisory?: unknown;
  };
  if (
    advisory !== "same_sex_criminalised" ||
    typeof country_code !== "string" ||
    !/^[A-Z]{2}$/.test(country_code)
  )
    return null;
  return {
    kind: advisory,
    countryCode: country_code,
    countryName: countryName(country_code) ?? country_code,
  };
}
