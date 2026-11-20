import { z } from "zod";

export const emailSchema = z
  .string({ error: "Enter a valid email address." })
  .trim()
  .toLowerCase()
  .max(254, "Enter a valid email address.")
  .pipe(z.email("Enter a valid email address."));

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "That's a bit long — 128 characters at most.")
  .refine(
    (v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v),
    "Use at least one letter and one number.",
  );

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  adult: z.literal("on", { error: "You must be 18 or older to join Cubdles." }),
  terms: z.literal("on", {
    error: "Please accept the Terms and Privacy Policy.",
  }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const resetRequestSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  email: emailSchema,
  topic: z.enum(["general", "safety", "billing", "press", "privacy"]),
  message: z
    .string()
    .trim()
    .min(10, "A little more detail helps (10+ characters).")
    .max(4000),
  // Honeypot: real people leave this empty.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
