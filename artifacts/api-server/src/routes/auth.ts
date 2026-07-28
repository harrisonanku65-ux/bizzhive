import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, vendorsTable, cartItemsTable, coursesTable, productsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { loginRateLimit, registerRateLimit, resendVerificationRateLimit } from "../middlewares/rateLimit";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/mailer";
import { VerifyEmailResponse, ChangePasswordResponse } from "@workspace/api-zod";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function generateVerificationToken() {
  return {
    token: crypto.randomBytes(32).toString("hex"),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  };
}

/** Fire-and-forget — a mail outage must never fail registration or the resend request. */
function sendVerificationEmail(email: string, token: string) {
  void sendEmail({
    to: email,
    subject: "Verify your BizzHive email",
    body: "Welcome to BizzHive! Please verify your email address to activate your account.\n\nThis link expires in 24 hours.",
    action: { label: "Verify Email", path: `/verify-email?token=${token}` },
  });
}

const router: IRouter = Router();
const SALT_ROUNDS = 10;

const PASSWORD_MIN_LENGTH = 8;

/** Mirrors artifacts/bizzhive/src/lib/password.ts — keep the two in sync. */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789",
  "1234567890", "qwerty123", "qwertyuiop", "11111111", "abc12345",
  "iloveyou", "welcome1", "admin123", "letmein1", "football",
  "monkey123", "sunshine", "princess", "ghana123", "bizzhive",
]);

/**
 * Server-side password policy. The signup form checks the same rules for
 * usability, but that's bypassable — this is the check that actually counts.
 *
 * Returns an error message, or null if the password is acceptable.
 */
function validatePassword(
  password: unknown,
  context: { email?: string; firstName?: string; lastName?: string },
): string | null {
  if (typeof password !== "string") return "Password is required";

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a symbol";

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return "That password is too common. Please choose something less predictable.";
  }

  const personalParts = [context.email?.split("@")[0], context.firstName, context.lastName]
    .filter((p): p is string => typeof p === "string" && p.length >= 3)
    .map((p) => p.toLowerCase());

  if (personalParts.some((part) => lower.includes(part))) {
    return "Your password shouldn't contain your name or email";
  }

  return null;
}

function buildAuthUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    role: user.role,
    vendorId: user.vendorId,
    avatar: user.avatar,
    phone: user.phone,
    emailVerified: !!user.emailVerified,
  };
}

function setAuthSession(req: any, userId: number, role: string) {
  req.session.userId = userId;
  req.session.role = role;
}

async function mergeGuestCartIntoUser(req: any, userId: number) {
  const guestSessionId = req.cookies?.session_id;
  if (!guestSessionId) return;

  const userSessionId = `user-${userId}`;
  const guestItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, guestSessionId));

  for (const item of guestItems) {
    const existing = await db.select().from(cartItemsTable).where(
      and(
        eq(cartItemsTable.sessionId, userSessionId),
        eq(cartItemsTable.itemType, item.itemType),
        eq(cartItemsTable.itemId, item.itemId)
      )
    );
    if (existing.length === 0) {
      await db.update(cartItemsTable).set({ sessionId: userSessionId }).where(eq(cartItemsTable.id, item.id));
    } else {
      await db.delete(cartItemsTable).where(eq(cartItemsTable.id, item.id));
    }
  }
}

router.post("/auth/register", registerRateLimit, async (req, res): Promise<void> => {
  const { email, password, firstName, lastName, displayName, role, phone, vendorName, vendorBio, vendorLocation } = req.body;

  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ error: "email, password, firstName, lastName are required" });
    return;
  }

  const passwordError = validatePassword(password, { email, firstName, lastName });
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userRole = role === "seller" ? "seller" : "buyer";
    const { token: verificationToken, expiresAt: verificationExpiresAt } = generateVerificationToken();

    const result = await db.transaction(async (tx) => {
      let vendorId: number | null = null;

      if (userRole === "seller") {
        const vendorSlug = (vendorName ?? displayName ?? email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
        const [vendor] = await tx.insert(vendorsTable).values({
          name: vendorName ?? displayName ?? `${firstName} ${lastName}`,
          slug: vendorSlug,
          bio: vendorBio ?? null,
          location: vendorLocation ?? null,
        }).returning();
        vendorId = vendor.id;
      }

      const [user] = await tx.insert(usersTable).values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        displayName: displayName ?? `${firstName} ${lastName}`,
        role: userRole,
        vendorId: vendorId ?? undefined,
        phone: phone ?? null,
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
      }).returning();

      return { user, vendorId };
    });

    sendVerificationEmail(result.user.email, verificationToken);

    setAuthSession(req, result.user.id, userRole);
    await mergeGuestCartIntoUser(req, result.user.id);
    res.status(201).json(buildAuthUser({ ...result.user, vendorId: result.vendorId }));
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    logger.error({ err }, "Registration failed");
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/auth/login", loginRateLimit, async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));

    if (!user || user.deletedAt) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    setAuthSession(req, user.id, user.role);
    await mergeGuestCartIntoUser(req, user.id);
    res.json(buildAuthUser(user));
  } catch (err: any) {
    logger.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.deletedAt) {
    req.session.destroy?.(() => {});
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json(buildAuthUser(user));
});

router.post("/auth/logout", (req, res): void => {
  req.session?.destroy?.(() => {});
  res.json({ success: true });
});

router.patch("/auth/profile", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { firstName, lastName, displayName, phone, avatar } = req.body ?? {};

  const updates: Record<string, unknown> = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (displayName !== undefined) updates.displayName = displayName;
  if (phone !== undefined) updates.phone = phone;
  if (avatar !== undefined) updates.avatar = avatar;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  updates.updatedAt = new Date();

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json(buildAuthUser(updated));
});

router.post("/auth/change-password", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordError = validatePassword(newPassword, {
    email: user.email,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
  });
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, userId));

  res.json(ChangePasswordResponse.parse({ status: "changed" }));
});

router.get("/auth/verify-email", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).json({ error: "A verification token is required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.emailVerificationToken, token));
  if (!user) {
    res.status(400).json({ error: "This verification link is invalid. It may have already been used — try signing in." });
    return;
  }

  if (user.emailVerified) {
    res.json(VerifyEmailResponse.parse({ status: "verified", email: user.email }));
    return;
  }

  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "This verification link has expired. Sign in and request a new one." });
    return;
  }

  await db.update(usersTable).set({
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
  }).where(eq(usersTable.id, user.id));

  res.json(VerifyEmailResponse.parse({ status: "verified", email: user.email }));
});

router.post("/auth/resend-verification", resendVerificationRateLimit, async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.deletedAt) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (user.emailVerified) {
    res.json({ status: "already_verified" });
    return;
  }

  const { token, expiresAt } = generateVerificationToken();
  await db.update(usersTable).set({
    emailVerificationToken: token,
    emailVerificationExpiresAt: expiresAt,
  }).where(eq(usersTable.id, userId));

  sendVerificationEmail(user.email, token);

  res.json({ status: "sent" });
});

router.post("/auth/delete-account", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { password } = req.body;
  if (!password) { res.status(400).json({ error: "Password confirmation required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "Account not found" }); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Incorrect password" }); return; }

  let hasActivity = false;
  if (user.vendorId) {
    const [{ count: courseCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable).where(eq(coursesTable.vendorId, user.vendorId));
    const [{ count: productCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.vendorId, user.vendorId));
    hasActivity = courseCount > 0 || productCount > 0;
  }

  if (hasActivity) {
    await db.update(usersTable).set({
      email: `deleted-${userId}@bizzhive.local`,
      passwordHash: await bcrypt.hash(crypto.randomUUID(), SALT_ROUNDS),
      firstName: null,
      lastName: null,
      displayName: "Deleted User",
      phone: null,
      deletedAt: new Date(),
    }).where(eq(usersTable.id, userId));

    if (user.vendorId) {
      await db.update(coursesTable).set({ published: false }).where(eq(coursesTable.vendorId, user.vendorId));
      await db.update(productsTable).set({ published: false }).where(eq(productsTable.vendorId, user.vendorId));
    }

    req.session?.destroy?.(() => {});
    res.json({ status: "anonymized", message: "Your account has been deactivated and your personal data removed. Existing listings were unpublished." });
    return;
  }

  if (user.vendorId) {
    await db.delete(vendorsTable).where(eq(vendorsTable.id, user.vendorId));
  }
  await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, `user-${userId}`));
  await db.delete(usersTable).where(eq(usersTable.id, userId));

  req.session?.destroy?.(() => {});
  res.json({ status: "deleted" });
});

export default router;
