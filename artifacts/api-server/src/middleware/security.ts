import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";

function parseAllowedOrigins(): Set<string> {
  const configured = process.env.CORS_ALLOWED_ORIGINS ?? "";
  const origins = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.includes("*")) {
    throw new Error(
      "CORS_ALLOWED_ORIGINS must contain explicit origins; wildcard '*' is not allowed.",
    );
  }

  return new Set(origins);
}

export const allowedCorsOrigins = parseAllowedOrigins();

function rateLimitMessage(windowMs: number, limit: number): string {
  const windowMinutes = Math.max(1, Math.round(windowMs / 60_000));
  return `Too many requests. Please try again in ${windowMinutes} minutes.`;
}

export const authRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: rateLimitMessage(15 * 60 * 1000, 20) },
});

export const uploadRateLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: rateLimitMessage(60 * 60 * 1000, 30) },
});