import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Use 3–20 letters, numbers, or underscores.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Add a display name.")
  .max(40, "Keep the display name under 40 characters.");

export const rangePairSchema = z
  .object({
    rangeLow: z.number().int().min(21).max(108),
    rangeHigh: z.number().int().min(21).max(108),
  })
  .refine((value) => value.rangeHigh > value.rangeLow, {
    message: "The highest note must sit above the lowest.",
  });

export const signupSchema = z
  .object({
    email: z.email("Enter a valid email."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
    username: usernameSchema,
    displayName: displayNameSchema,
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export const profileFormSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameSchema,
    rangeLow: z.number().int().min(21).max(108),
    rangeHigh: z.number().int().min(21).max(108),
  })
  .refine((value) => value.rangeHigh > value.rangeLow, {
    message: "The highest note must sit above the lowest.",
  });

export const passwordUpdateSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Check the form.";
}

export function authErrorMessage(error: { message?: string; code?: string }): string {
  const text = `${error.message ?? ""} ${error.code ?? ""}`.toLowerCase();
  if (text.includes("username_taken") || text.includes("23505") || text.includes("duplicate")) {
    return "That username is taken.";
  }
  if (text.includes("invalid_username")) {
    return "Use 3–20 letters, numbers, or underscores.";
  }
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "An account with that email already exists.";
  }
  if (text.includes("invalid login") || text.includes("invalid_credentials")) {
    return "Email or password is incorrect.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirm your email, then log in.";
  }
  return "Something went wrong. Try again.";
}
