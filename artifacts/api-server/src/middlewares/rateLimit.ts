import type { Request, Response, NextFunction } from "express";

/**
 * Small in-memory rate limiter for authentication endpoints.
 *
 * Deliberately dependency-free: this repo enforces a minimum npm release age,
 * so adding express-rate-limit for ~40 lines of logic isn't worth the supply
 * chain surface.
 *
 * Caveat worth knowing: state lives in this process. Behind multiple API
 * instances each gets its own counter, so the effective limit multiplies by
 * the instance count. That's still far better than nothing, but if you scale
 * horizontally, move this to Redis.
 */

interface Bucket {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

// Bound each limiter's map so a flood of unique IPs can't grow it without limit.
const MAX_TRACKED_KEYS = 10_000;

function sweep(buckets: Map<string, Bucket>, now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now && (bucket.blockedUntil ?? 0) < now) {
      buckets.delete(key);
    }
  }
}

function clientKey(req: Request): string {
  // req.ip respects trust proxy; fall back to the socket address.
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  // Bucket per IP *and* per email where present, so one attacker hammering
  // many accounts from one IP is caught, and a distributed attack on a single
  // account is caught too.
  const email =
    typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
  return `${ip}|${email}`;
}

export interface RateLimitOptions {
  /** Requests allowed within the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** How long to lock out once the limit is exceeded. */
  blockMs: number;
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    max,
    windowMs,
    blockMs,
    message = "Too many attempts. Please wait a moment and try again.",
  } = options;

  // Each limiter gets its own bucket store, so e.g. logging in twice doesn't
  // eat into the separate budget for submitting support tickets.
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    sweep(buckets, now);

    const key = clientKey(req);
    let bucket = buckets.get(key);

    if (bucket?.blockedUntil && bucket.blockedUntil > now) {
      const retryAfter = Math.ceil((bucket.blockedUntil - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: message, retryAfter });
      return;
    }

    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      bucket.blockedUntil = now + blockMs;
      const retryAfter = Math.ceil(blockMs / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: message, retryAfter });
      return;
    }

    next();
  };
}

/** Sign-in attempts: 8 per 15 min, then a 15 minute lockout. */
export const loginRateLimit = rateLimit({
  max: 8,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
  message: "Too many sign-in attempts. Please wait 15 minutes and try again.",
});

/** Account creation: 5 per hour per IP. */
export const registerRateLimit = rateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000,
  blockMs: 60 * 60 * 1000,
  message: "Too many accounts created from this connection. Try again later.",
});

/** Admin sign-in is stricter — these accounts can move money. */
export const adminLoginRateLimit = rateLimit({
  max: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
  message: "Too many attempts. This login is locked for 30 minutes.",
});

/** Support form, to stop it being used as a spam relay. */
export const supportRateLimit = rateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
  message: "You've sent several messages already. We'll reply to those first.",
});

/** Resending a verification email: 3 per hour per account. */
export const resendVerificationRateLimit = rateLimit({
  max: 3,
  windowMs: 60 * 60 * 1000,
  blockMs: 60 * 60 * 1000,
  message: "You've requested this a few times already. Check your inbox (and spam folder), or try again in an hour.",
});
