import { z } from "zod";

const FAKE_EMAIL_DOMAINS = new Set([
  "test.com", "test.org", "test.net", "example.com", "example.org", "example.net",
  "fake.com", "foo.com", "bar.com", "sample.com", "domain.com", "yourdomain.com",
  "dummy.com", "placeholder.com", "noemail.com", "notreal.com", "email.com",
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "throwawaymail.com",
]);

export const signupEmailSchema = z
  .string()
  .email("Enter a valid email")
  .refine((email) => !FAKE_EMAIL_DOMAINS.has(email.split("@")[1]?.toLowerCase() ?? ""), {
    message: "Please use a real email address",
  });

export const passwordSchema = z
  .string()
  .min(6, "Must be at least 6 characters")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[0-9]/, "Must include a number")
  .regex(/[^A-Za-z0-9]/, "Must include a special character");
