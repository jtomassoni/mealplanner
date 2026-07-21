import { z } from "zod";

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    return v === "true" || v === "1";
  });

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  ALLOWED_EMAILS: z.string().min(1),
  DEFAULT_HOUSEHOLD_NAME: z.string().default("JT and Mary"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  RESEND_API_KEY: z.string().optional().default(""),
  RESEND_FROM_EMAIL: z.string().optional().default(""),
  APP_URL: z.string().url().default("http://localhost:3000"),
  ENABLE_EMAIL_NOTIFICATIONS: boolFromString.default(false),
  ENABLE_AI_FEATURES: boolFromString.default(true),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,
    DEFAULT_HOUSEHOLD_NAME: process.env.DEFAULT_HOUSEHOLD_NAME,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    APP_URL: process.env.APP_URL,
    ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS,
    ENABLE_AI_FEATURES: process.env.ENABLE_AI_FEATURES,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  cached = parsed.data;
  return cached;
}

/** Soft env read for build-time / missing-config paths. */
export function getEnvSafe(): ServerEnv | null {
  try {
    return getEnv();
  } catch {
    return null;
  }
}

export function isAiEnabled(): boolean {
  const env = getEnvSafe();
  return Boolean(env?.ENABLE_AI_FEATURES && env.OPENAI_API_KEY);
}

export function isEmailEnabled(): boolean {
  const env = getEnvSafe();
  return Boolean(
    env?.ENABLE_EMAIL_NOTIFICATIONS &&
      env.RESEND_API_KEY &&
      env.RESEND_FROM_EMAIL,
  );
}
