import { z } from "zod";
import {
  CUDDLE_STYLES,
  DISTANCES_KM,
  GENDER_GROUPS,
  INTENTIONS,
  LIFESTYLE_FIELDS,
  LOVE_LANGUAGES,
  PACES,
  SHOW_ME,
} from "./options";

/** Validation for each onboarding step. Pure (no server imports) so it can be unit-tested and reused client-side. */

const values = <T extends readonly { value: string }[]>(opts: T) =>
  opts.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

/** Age in whole years on a given day (birthdays on 29 Feb count from 1 Mar in non-leap years). */
export function ageOn(birth: Date, today: Date): number {
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const m = today.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

/** True only for real calendar dates (JS would silently turn 2001-02-30 into 2 March). */
export function isRealDate(iso: string): boolean {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === iso;
}

export const birthdaySchema = z.object({
  birthDate: z
    .string({ error: "Enter your date of birth." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
    .refine(isRealDate, "That date doesn't look right.")
    .refine((v) => {
      const age = ageOn(new Date(`${v}T00:00:00Z`), new Date());
      return age >= 0 && age <= 100;
    }, "That date doesn't look right."),
  consent: z.literal("on", { error: "Please accept the Terms and Privacy Policy to continue." }),
});

export const basicsSchema = z.object({
  displayName: z
    .string({ error: "Tell us what to call you." })
    .trim()
    .min(1, "Tell us what to call you.")
    .max(40, "Keep it under 40 characters.")
    .regex(/^[\p{L}\p{M}' .-]+$/u, "Use letters only — no numbers or links.")
    .refine((v) => !/(^|\s)www\.|\.\p{L}{2,}(\s|$)/iu.test(v), "Use letters only — no numbers or links."),
  genderGroup: z.enum(values(GENDER_GROUPS), { error: "Choose the option that fits best." }),
  genderIdentity: optionalText(40),
  pronouns: optionalText(30),
});

export const lookingForSchema = z
  .object({
    intention: z.enum(values(INTENTIONS), { error: "Choose what you're looking for." }),
    showGenders: z.array(z.enum(values(SHOW_ME))).min(1, "Choose at least one."),
    ageMin: z.coerce.number({ error: "Enter an age." }).int().min(18, "18 is the youngest.").max(99),
    ageMax: z.coerce.number({ error: "Enter an age." }).int().min(18).max(99, "99 is the oldest."),
  })
  .refine((v) => v.ageMin <= v.ageMax, { message: "The first age should be the smaller one.", path: ["ageMax"] });

export const locationSchema = z
  .object({
    mode: z.enum(["device", "city"]),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    cityId: z.coerce.number().int().positive().optional(),
    timezone: z.string().max(64).regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/).optional().or(z.literal("").transform(() => undefined)),
    distanceKm: z.coerce
      .number()
      .refine((v) => (DISTANCES_KM as readonly number[]).includes(v), "Choose a distance."),
  })
  .refine((v) => (v.mode === "device" ? v.lat !== undefined && v.lng !== undefined : v.cityId !== undefined), {
    message: "Share your location or choose your city.",
    path: ["cityId"],
  });

export const affectionSchema = z.object({
  cuddleStyle: z.enum(values(CUDDLE_STYLES), { error: "Choose one — 'Not sure yet' is fine." }),
  pace: z.enum(values(PACES), { error: "Choose the pace that feels right." }),
  touchComfort: z.coerce.number({ error: "Choose a number." }).int().min(1, "Choose a number.").max(5),
  publicAffection: z.coerce.number().int().min(1).max(5).optional(),
  loveLanguages: z.array(z.enum(values(LOVE_LANGUAGES))).max(2, "Choose up to two."),
});

const lifestyleShape = Object.fromEntries(
  Object.entries(LIFESTYLE_FIELDS).map(([key, field]) => [
    key,
    z
      .enum(field.options.map(([v]) => v) as [string, ...string[]])
      .optional()
      .or(z.literal("").transform(() => undefined)),
  ]),
) as unknown as Record<keyof typeof LIFESTYLE_FIELDS, z.ZodType<string | undefined>>;

export const interestsSchema = z.object({
  interestIds: z.array(z.coerce.number().int().positive()).min(3, "Pick at least 3.").max(10, "Pick up to 10."),
  ...lifestyleShape,
});

export const promptsSchema = z.object({
  answers: z
    .array(
      z.object({
        promptId: z.coerce.number().int().positive(),
        answer: z.string().trim().min(1, "Write a short answer.").max(200, "Keep it under 200 characters."),
      }),
    )
    .min(1, "Answer at least one prompt.")
    .max(3, "Up to three prompts.")
    .refine((a) => new Set(a.map((x) => x.promptId)).size === a.length, "Choose a different prompt for each answer."),
});

export const aboutSchema = z.object({
  bio: z.string().trim().min(20, "A couple of sentences helps people say hello (20+ characters).").max(500, "Keep it under 500 characters."),
  jobTitle: optionalText(60),
  education: optionalText(80),
});

/**
 * Prompt rows from a form: fields named promptId-0/answer-0 … promptId-2/answer-2.
 * Slots with no prompt chosen and no answer are skipped.
 */
export function readPromptAnswers(formData: FormData) {
  const answers: { promptId: string; answer: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const promptId = String(formData.get(`promptId-${i}`) ?? "");
    const answer = String(formData.get(`answer-${i}`) ?? "");
    if (!promptId && !answer.trim()) continue;
    answers.push({ promptId, answer });
  }
  return answers;
}
