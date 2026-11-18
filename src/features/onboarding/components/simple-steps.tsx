"use client";

/**
 * Presentational step forms. Each takes initial values as props and posts to its server action.
 * No data fetching or business rules live here, so a Figma-driven redesign only replaces markup.
 */

import Link from "next/link";
import { CheckboxChips, ChoiceFieldset, RadioChoices, ScaleChoice } from "@/components/ui/choice";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useActionForm } from "@/components/ui/use-action-form";
import type { FormState } from "@/lib/auth/schemas";
import {
  saveAbout,
  saveAffection,
  saveBasics,
  saveBirthday,
  saveInterests,
  saveLookingFor,
} from "../actions";
import {
  CUDDLE_STYLES,
  GENDER_GROUPS,
  INTENTIONS,
  LIFESTYLE_FIELDS,
  LOVE_LANGUAGES,
  PACES,
  SHOW_ME,
  type CuddleStyle,
  type GenderGroup,
  type Intention,
  type LoveLanguage,
  type Pace,
} from "../options";
import { FormMessage } from "./step-shell";
import { useStepMode } from "./step-mode";

const errorProps = (e: Record<string, string>, name: string) =>
  e[name] ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {};

/** Submit button for every step. In edit mode it also marks the form so the action saves and returns to the profile. */
export function Continue({ pending, label }: { pending: boolean; label?: string }) {
  const mode = useStepMode();
  return (
    <>
      {mode === "edit" ? <input type="hidden" name="_mode" value="edit" /> : null}
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : (label ?? (mode === "edit" ? "Save changes" : "Continue"))}
      </Button>
    </>
  );
}

// ---------------------------------------------------------------------------

/** `today` (YYYY-MM-DD) is passed from the server: reading the clock in a client component breaks prerendering. */
export function BirthdayStep({ birthDate, termsAccepted, today }: { birthDate: string | null; termsAccepted: boolean; today: string }) {
  const { state, pending, formProps } = useActionForm<FormState>(saveBirthday);
  const e = state.errors ?? {};
  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormMessage message={state.message} />
      {birthDate ? (
        <div className="rounded-2xl bg-linen px-5 py-4 ring-1 ring-oat">
          <p className="text-sm text-mocha">Date of birth</p>
          <p className="text-lg">{new Date(`${birthDate}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</p>
          <p className="mt-1 text-sm text-mocha">This can&rsquo;t be changed here. Contact us if it&rsquo;s wrong.</p>
          <input type="hidden" name="birthDate" value={birthDate} />
        </div>
      ) : (
        <Field label="Date of birth" htmlFor="birthDate" error={e.birthDate} hint="You can't change this later, so please check it.">
          <Input id="birthDate" name="birthDate" type="date" required autoComplete="bday" max={today} {...errorProps(e, "birthDate")} />
        </Field>
      )}
      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" defaultChecked={termsAccepted} className="mt-0.5 size-5 accent-clay" {...errorProps(e, "consent")} />
          <span>
            I agree to the <Link href="/terms" target="_blank" className="text-clay underline underline-offset-4">Terms</Link> and{" "}
            <Link href="/privacy" target="_blank" className="text-clay underline underline-offset-4">Privacy Policy</Link>, and I&rsquo;ll follow the{" "}
            <Link href="/guidelines" target="_blank" className="text-clay underline underline-offset-4">Community guidelines</Link>.
          </span>
        </label>
        {e.consent ? <p id="consent-error" role="alert" className="text-sm text-alert">{e.consent}</p> : null}
        {!termsAccepted ? (
          <label className="flex items-start gap-3 text-sm text-mocha">
            <input type="checkbox" name="marketing" className="mt-0.5 size-5 accent-clay" />
            <span>Send me occasional news and tips by email (optional).</span>
          </label>
        ) : null}
      </div>
      <Continue pending={pending} />
    </form>
  );
}

// ---------------------------------------------------------------------------

export function BasicsStep(props: { displayName: string | null; genderGroup: GenderGroup | null; genderIdentity: string | null; pronouns: string | null }) {
  const { state, pending, formProps } = useActionForm<FormState>(saveBasics);
  const e = state.errors ?? {};
  const groupLabel = GENDER_GROUPS.find((g) => g.value === props.genderGroup)?.label;
  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormMessage message={state.message} />
      <Field label="First name" htmlFor="displayName" error={e.displayName} hint="This is how you'll appear. You can use a nickname.">
        <Input id="displayName" name="displayName" autoComplete="given-name" defaultValue={props.displayName ?? ""} required maxLength={40} {...errorProps(e, "displayName")} />
      </Field>
      <ChoiceFieldset legend="I am a" error={e.genderGroup} hint="Used for matching. You can describe yourself in your own words below.">
        <RadioChoices name="genderGroup" options={[...GENDER_GROUPS]} defaultValue={props.genderGroup} />
      </ChoiceFieldset>
      <Field label="How you describe your gender (optional)" htmlFor="genderIdentity" error={e.genderIdentity} hint="Shown on your profile, e.g. “Trans woman” or “Genderqueer”.">
        <Input id="genderIdentity" name="genderIdentity" defaultValue={props.genderIdentity && props.genderIdentity !== groupLabel ? props.genderIdentity : ""} maxLength={40} />
      </Field>
      <Field label="Pronouns (optional)" htmlFor="pronouns" error={e.pronouns}>
        <Input id="pronouns" name="pronouns" defaultValue={props.pronouns ?? ""} maxLength={30} placeholder="e.g. she/her" />
      </Field>
      <Continue pending={pending} />
    </form>
  );
}

// ---------------------------------------------------------------------------

export function LookingForStep(props: { intention: Intention | null; showGenders: GenderGroup[]; ageMin: number; ageMax: number }) {
  const { state, pending, formProps } = useActionForm<FormState>(saveLookingFor);
  const e = state.errors ?? {};
  return (
    <form {...formProps} className="flex flex-col gap-7">
      <FormMessage message={state.message} />
      <ChoiceFieldset legend="I'm looking for" error={e.intention}>
        <RadioChoices name="intention" options={[...INTENTIONS]} defaultValue={props.intention} layout="cards" />
      </ChoiceFieldset>
      <ChoiceFieldset legend="Show me" error={e.showGenders}>
        <CheckboxChips name="showGenders" options={[...SHOW_ME]} defaultValues={props.showGenders} />
      </ChoiceFieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Ages</legend>
        <div className="flex items-center gap-3">
          <label htmlFor="ageMin" className="sr-only">Youngest</label>
          <Input id="ageMin" name="ageMin" type="number" inputMode="numeric" min={18} max={99} defaultValue={props.ageMin} className="w-24" {...errorProps(e, "ageMin")} />
          <span className="text-mocha">to</span>
          <label htmlFor="ageMax" className="sr-only">Oldest</label>
          <Input id="ageMax" name="ageMax" type="number" inputMode="numeric" min={18} max={99} defaultValue={props.ageMax} className="w-24" {...errorProps(e, "ageMax")} />
        </div>
        {e.ageMin || e.ageMax ? <p id={e.ageMin ? "ageMin-error" : "ageMax-error"} role="alert" className="text-sm text-alert">{e.ageMin ?? e.ageMax}</p> : null}
      </fieldset>
      <Continue pending={pending} />
    </form>
  );
}

// ---------------------------------------------------------------------------

export function AffectionStep(props: {
  cuddleStyle: CuddleStyle | null;
  pace: Pace | null;
  touchComfort: number | null;
  publicAffection: number | null;
  loveLanguages: LoveLanguage[];
}) {
  const { state, pending, formProps } = useActionForm<FormState>(saveAffection);
  const e = state.errors ?? {};
  return (
    <form {...formProps} className="flex flex-col gap-8">
      <FormMessage message={state.message} />
      <ChoiceFieldset legend="Big spoon or little spoon?" error={e.cuddleStyle}>
        <RadioChoices name="cuddleStyle" options={[...CUDDLE_STYLES]} defaultValue={props.cuddleStyle} />
      </ChoiceFieldset>
      <ChoiceFieldset legend="Your pace" error={e.pace}>
        <RadioChoices name="pace" options={[...PACES]} defaultValue={props.pace} layout="cards" />
      </ChoiceFieldset>
      <ChoiceFieldset legend="How much do you enjoy cuddling and touch?" error={e.touchComfort}>
        <ScaleChoice name="touchComfort" defaultValue={props.touchComfort} lowLabel="A little goes a long way" highLabel="Can't get enough" />
      </ChoiceFieldset>
      <ChoiceFieldset legend="Holding hands in public? (optional)" error={e.publicAffection}>
        <ScaleChoice name="publicAffection" defaultValue={props.publicAffection} lowLabel="Keep it private" highLabel="Love it" />
      </ChoiceFieldset>
      <ChoiceFieldset legend="I feel most cared for through" hint="Choose up to two (optional)." error={e.loveLanguages}>
        <CheckboxChips name="loveLanguages" options={[...LOVE_LANGUAGES]} defaultValues={props.loveLanguages} max={2} />
      </ChoiceFieldset>
      <Continue pending={pending} />
    </form>
  );
}

// ---------------------------------------------------------------------------

export function InterestsStep(props: {
  catalogue: { id: number; label: string; category: string }[];
  selected: number[];
  lifestyle: Record<string, string | null>;
}) {
  const { state, pending, formProps } = useActionForm<FormState>(saveInterests);
  const e = state.errors ?? {};
  const options = props.catalogue.map((i) => ({ value: String(i.id), label: i.label }));
  return (
    <form {...formProps} className="flex flex-col gap-8">
      <FormMessage message={state.message} />
      <ChoiceFieldset legend="Interests" srOnlyLegend error={e.interestIds}>
        {options.length ? (
          <CheckboxChips name="interestIds" options={options} defaultValues={props.selected.map(String)} max={10} />
        ) : (
          <p className="text-mocha">Interests couldn&rsquo;t be loaded. Please refresh.</p>
        )}
      </ChoiceFieldset>
      <details className="rounded-2xl bg-linen/70 px-5 py-4 ring-1 ring-oat" open={Object.values(props.lifestyle).some(Boolean)}>
        <summary className="cursor-pointer font-medium">Lifestyle (optional)</summary>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {Object.entries(LIFESTYLE_FIELDS).map(([key, field]) => (
            <Field key={key} label={field.label} htmlFor={key}>
              <Select id={key} name={key} defaultValue={props.lifestyle[key] ?? ""}>
                <option value="">—</option>
                {field.options.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
          ))}
        </div>
      </details>
      <Continue pending={pending} />
    </form>
  );
}

// ---------------------------------------------------------------------------

export function AboutStep(props: { bio: string | null; jobTitle: string | null; education: string | null }) {
  const { state, pending, formProps } = useActionForm<FormState>(saveAbout);
  const e = state.errors ?? {};
  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormMessage message={state.message} />
      <Field label="Bio" htmlFor="bio" error={e.bio} hint="What's a perfect evening? What makes you laugh? 20–500 characters.">
        <Textarea id="bio" name="bio" rows={5} maxLength={500} defaultValue={props.bio ?? ""} {...errorProps(e, "bio")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Work (optional)" htmlFor="jobTitle" error={e.jobTitle}>
          <Input id="jobTitle" name="jobTitle" maxLength={60} defaultValue={props.jobTitle ?? ""} placeholder="e.g. Teacher" />
        </Field>
        <Field label="Education (optional)" htmlFor="education" error={e.education}>
          <Input id="education" name="education" maxLength={80} defaultValue={props.education ?? ""} />
        </Field>
      </div>
      <Continue pending={pending} />
    </form>
  );
}
