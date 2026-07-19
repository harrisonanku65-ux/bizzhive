import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const SALT_ROUNDS = 10;

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
  };
}

function setAuthSession(req: any, userId: number, role: string) {
  req.session.userId = userId;
  req.session.role = role;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, firstName, lastName, displayName, role, phone, vendorName, vendorBio, vendorLocation } = req.body;

  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ error: "email, password, firstName, lastName are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userRole = role === "seller" ? "seller" : "buyer";

  let vendorId: number | null = null;

  if (userRole === "seller") {
    const vendorSlug = (vendorName ?? displayName ?? email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
    const [vendor] = await db.insert(vendorsTable).values({
      name: vendorName ?? displayName ?? `${firstName} ${lastName}`,
      slug: vendorSlug,
      bio: vendorBio ?? null,
      location: vendorLocation ?? null,
    }).returning();
    vendorId = vendor.id;
  }

  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    firstName,
    lastName,
    displayName: displayName ?? `${firstName} ${lastName}`,
    role: userRole,
    vendorId: vendorId ?? undefined,
    phone: phone ?? null,
  }).returning();

  setAuthSession(req, user.id, userRole);
  res.status(201).json(buildAuthUser({ ...user, vendorId }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  setAuthSession(req, user.id, user.role);
  res.json(buildAuthUser(user));
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
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

export default router;
