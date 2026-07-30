import { Router, type IRouter } from "express";
import { db, cartItemsTable, coursesTable, productsTable, vendorsTable, ordersTable, sessionSlotsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { confirmSlotBookingsForOrder } from "./sessions";
import { notifyOrderPaid, notifySessionBooked } from "../lib/notifications";

const router: IRouter = Router();

const PAYSTACK_SECRET_KEY = process.env["PAYSTACK_SECRET_KEY"] ?? "";
const FLUTTERWAVE_SECRET_KEY = process.env["FLUTTERWAVE_SECRET_KEY"] ?? "";
const PAYSTACK_PUBLIC_KEY = process.env["PAYSTACK_PUBLIC_KEY"] ?? "";
const FLUTTERWAVE_PUBLIC_KEY = process.env["FLUTTERWAVE_PUBLIC_KEY"] ?? "";

function getSessionId(req: any): string {
  if (req.session?.userId) {
    return `user-${req.session.userId}`;
  }
  if (!req.cookies?.session_id) {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    req.res.cookie("session_id", id, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return id;
  }
  return req.cookies.session_id;
}

// 14 days matches the consumer cancellation/cooling-off window in Ghana's
// Electronic Transactions Act, 2008 (Act 772) s.49 — that section governs
// buyer cancellation rights, not escrow release specifically, so this is an
// informed default rather than a confirmed legal requirement.
const DEFAULT_DELIVERY_AUTO_RELEASE_MINUTES = 14 * 24 * 60;

function computeDeliveryDeadline(): Date {
  // `??` only falls back on null/undefined — an empty string (e.g. a blank
  // .env value) survives it and Number("") is 0, which would set every
  // order's deadline to "right now" and let the 5-minute auto-release sweep
  // pay the seller before the buyer has any real chance to confirm or dispute.
  const raw = process.env["DELIVERY_AUTO_RELEASE_MINUTES"];
  const minutes = raw ? Number(raw) : NaN;
  const deadline = new Date();
  deadline.setMinutes(deadline.getMinutes() + (Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_DELIVERY_AUTO_RELEASE_MINUTES));
  return deadline;
}

async function buildCartTotal(sessionId: string) {
  const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
  const cartItems: any[] = [];
  let total = 0;

  for (const item of items) {
    if (item.itemType === "course") {
      const [course] = await db.select({
        title: coursesTable.title,
        price: coursesTable.price,
        currency: coursesTable.currency,
        vendorId: coursesTable.vendorId,
      }).from(coursesTable).where(eq(coursesTable.id, item.itemId));

      if (course) {
        const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, course.vendorId));
        cartItems.push({ id: item.id, itemType: item.itemType, itemId: item.itemId, title: course.title, price: course.price, currency: course.currency, vendorId: course.vendorId, vendorName: vendor?.name ?? "" });
        total += course.price;
      }
    } else if (item.itemType === "session") {
      const [slot] = await db.select({
        title: sessionSlotsTable.title,
        price: sessionSlotsTable.price,
        currency: sessionSlotsTable.currency,
        vendorId: sessionSlotsTable.vendorId,
        startsAt: sessionSlotsTable.startsAt,
        durationMinutes: sessionSlotsTable.durationMinutes,
        status: sessionSlotsTable.status,
      }).from(sessionSlotsTable).where(eq(sessionSlotsTable.id, item.itemId));

      // Only still-available slots are billable; anything else was taken or
      // cancelled while the buyer was checking out.
      if (slot && slot.status === "available") {
        const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, slot.vendorId));
        cartItems.push({ id: item.id, itemType: item.itemType, itemId: item.itemId, title: slot.title, price: slot.price, currency: slot.currency, vendorId: slot.vendorId, vendorName: vendor?.name ?? "", startsAt: slot.startsAt, durationMinutes: slot.durationMinutes });
        total += slot.price;
      }
    } else {
      const [product] = await db.select({
        title: productsTable.title,
        price: productsTable.price,
        currency: productsTable.currency,
        vendorId: productsTable.vendorId,
      }).from(productsTable).where(eq(productsTable.id, item.itemId));

      if (product) {
        const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, product.vendorId));
        cartItems.push({ id: item.id, itemType: item.itemType, itemId: item.itemId, title: product.title, price: product.price, currency: product.currency, vendorId: product.vendorId, vendorName: vendor?.name ?? "" });
        total += product.price;
      }
    }
  }

  return { items: cartItems, total: Math.round(total * 100) / 100 };
}

/**
 * Single place where an order becomes paid.
 *
 * Every provider path (Paystack verify, Flutterwave verify, both webhooks and
 * the keyless demo shortcuts) funnels through here so the escrow deadline,
 * cart clearing and session-slot booking can never drift apart between them.
 */
async function markOrderPaid(orderId: number, sessionId: string) {
  await db.update(ordersTable).set({
    paymentStatus: "paid",
    status: "completed",
    deliveryDeadline: computeDeliveryDeadline(),
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, orderId));

  // Turn held slots into real bookings before the cart is emptied.
  await confirmSlotBookingsForOrder(orderId);

  await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));

  // Fire-and-forget: a slow mail provider must not delay the payment response,
  // and a failed email must never undo a completed payment.
  void notifyOrderPaid(orderId);
  void notifySessionBooked(orderId);
}

async function initPaystack(email: string, amountGhs: number, reference: string, metadata: any) {
  const body: any = {
    email,
    amount: Math.round(amountGhs * 100),
    currency: "GHS",
    reference,
    metadata,
    callback_url: `${process.env["APP_URL"] ?? ""}/payment-success`,
  };

  const resp = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: any = await resp.json();
  if (!data.status) throw new Error(data.message ?? "Paystack initialization failed");
  return data.data as { authorization_url: string; access_code: string; reference: string };
}

async function initPaystackSubscription(email: string, planCode: string, amountGhs: number, reference: string, metadata: any) {
  const body: any = {
    email,
    plan: planCode,
    amount: Math.round(amountGhs * 100),
    reference,
    metadata,
    callback_url: `${process.env["APP_URL"] ?? ""}/payment-success`,
  };

  const resp = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: any = await resp.json();
  if (!data.status) throw new Error(data.message ?? "Paystack subscription initialization failed");
  return data.data as { authorization_url: string; access_code: string; reference: string };
}

async function initFlutterwave(email: string, phone: string | undefined, amountGhs: number, reference: string, items: any[]) {
  const body: any = {
    tx_ref: reference,
    amount: amountGhs,
    currency: "GHS",
    redirect_url: `${process.env["APP_URL"] ?? ""}/payment-success`,
    customer: { email, phonenumber: phone ?? "", name: email.split("@")[0] },
    meta: { items: items.map((i) => ({ title: i.title, price: i.price })) },
    customizations: {
      title: "BizzHive",
      description: "BizzHive Marketplace Payment",
      logo: "https://bizzhive.com/logo.png",
    },
    payment_options: "card,mobilemoneyghana",
  };

  const resp = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: any = await resp.json();
  if (data.status !== "success") throw new Error(data.message ?? "Flutterwave initialization failed");
  return data.data as { link: string };
}

router.post("/payments/initialize", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const { provider, email, phone, momoNetwork, paymentMethod } = req.body;

  if (!provider || !email) {
    res.status(400).json({ error: "provider and email are required" });
    return;
  }

  const { items, total } = await buildCartTotal(sessionId);

  if (items.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }



const [existingPending] = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.sessionId, sessionId),
      eq(ordersTable.paymentStatus, "unpaid"),
      eq(ordersTable.status, "pending")
    )
  ).orderBy(desc(ordersTable.id)).limit(1);

  const reference = `BH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  let order;

  if (existingPending && Math.abs(existingPending.total - total) < 0.01) {
    [order] = await db.update(ordersTable).set({
      paymentReference: reference,
      paymentProvider: provider,
      paymentMethod: paymentMethod ?? (momoNetwork ? "mobile_money" : "card"),
    }).where(eq(ordersTable.id, existingPending.id)).returning();
  } else {
    [order] = await db.insert(ordersTable).values({
      sessionId,
      items,
      total,
      currency: "GHS",
      status: "pending",
      paymentReference: reference,
      paymentProvider: provider,
      paymentMethod: paymentMethod ?? (momoNetwork ? "mobile_money" : "card"),
      paymentStatus: "unpaid",
    }).returning();
  }

  try {
    if (provider === "paystack") {
      if (!PAYSTACK_SECRET_KEY) {
        res.json({
          orderId: order.id,
          reference,
          provider: "paystack",
          paystackPublicKey: PAYSTACK_PUBLIC_KEY || "pk_test_demo",
          accessCode: null,
          paymentUrl: null,
          amount: total,
          currency: "GHS",
        });
        return;
      }

      const paystack = await initPaystack(email, total, reference, { orderId: order.id, momoNetwork, paymentMethod });
      res.json({
        orderId: order.id,
        reference,
        accessCode: paystack.access_code,
        paymentUrl: paystack.authorization_url,
        paystackPublicKey: PAYSTACK_PUBLIC_KEY,
        provider: "paystack",
        amount: total,
        currency: "GHS",
      });
    } else if (provider === "flutterwave") {
      if (!FLUTTERWAVE_SECRET_KEY) {
        res.json({
          orderId: order.id,
          reference,
          provider: "flutterwave",
          flutterwavePublicKey: FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK_TEST-demo",
          paymentUrl: null,
          accessCode: null,
          amount: total,
          currency: "GHS",
        });
        return;
      }

      const flw = await initFlutterwave(email, phone, total, reference, items);
      res.json({
        orderId: order.id,
        reference,
        paymentUrl: flw.link,
        flutterwavePublicKey: FLUTTERWAVE_PUBLIC_KEY,
        provider: "flutterwave",
        accessCode: null,
        amount: total,
        currency: "GHS",
      });
    } else {
      res.status(400).json({ error: "Invalid payment provider" });
    }
  } catch (err: any) {
    await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
    res.status(502).json({ error: err.message ?? "Payment initialization failed" });
  }
});

router.get("/payments/verify/:reference", async (req, res): Promise<void> => {
  const { reference } = req.params;
  const sessionId = getSessionId(req);

  const [order] = await db.select().from(ordersTable).where(
    and(eq(ordersTable.paymentReference, reference), eq(ordersTable.sessionId, sessionId))
  );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.paymentStatus === "paid") {
    res.json({ status: "success", orderId: order.id, reference, message: "Payment already verified", payoutScheduled: true });
    return;
  }

  if (!PAYSTACK_SECRET_KEY) {
    await markOrderPaid(order.id, sessionId);
    res.json({ status: "success", orderId: order.id, reference, message: "Payment verified (demo mode)", payoutScheduled: false });
    return;
  }

  const resp = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });

  const data: any = await resp.json();

  if (data.status && data.data?.status === "success") {
    await markOrderPaid(order.id, sessionId);
    res.json({ status: "success", orderId: order.id, reference, message: "Payment verified successfully", payoutScheduled: true });
  } else {
    res.json({ status: "failed", orderId: order.id, reference, message: data.data?.gateway_response ?? "Payment verification failed" });
  }
});

router.post("/payments/flutterwave/verify", async (req, res): Promise<void> => {
  const { transactionId, reference } = req.body;
  const sessionId = getSessionId(req);

  const [order] = await db.select().from(ordersTable).where(
    and(eq(ordersTable.paymentReference, reference), eq(ordersTable.sessionId, sessionId))
  );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.paymentStatus === "paid") {
    res.json({ status: "success", orderId: order.id, reference, message: "Payment already verified", payoutScheduled: true });
    return;
  }

  if (!FLUTTERWAVE_SECRET_KEY) {
    await markOrderPaid(order.id, sessionId);
    res.json({ status: "success", orderId: order.id, reference, message: "Payment verified (demo mode)", payoutScheduled: false });
    return;
  }

  const resp = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`, "Content-Type": "application/json" },
  });

  const data: any = await resp.json();

  if (data.status === "success" && data.data?.status === "successful") {
    await markOrderPaid(order.id, sessionId);
    res.json({ status: "success", orderId: order.id, reference, message: "Payment verified successfully", payoutScheduled: true });
  } else {
    res.json({ status: "failed", orderId: order.id, reference, message: "Flutterwave payment verification failed" });
  }
});

router.post("/payments/paystack/webhook", async (req, res): Promise<void> => {
  const hash = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest("hex");
  const signature = req.headers["x-paystack-signature"] as string;

  if (PAYSTACK_SECRET_KEY && hash !== signature) {
    res.status(401).send("Invalid signature");
    return;
  }

  const event = req.body;

  if (event.event === "charge.success" && event.data?.metadata?.type === "vendor_subscription") {
    const { vendorId, tier } = event.data.metadata;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await db.update(vendorsTable).set({
      plan: tier,
      planExpiresAt: expiresAt,
      verifiedSeller: tier === "premium",
      featured: tier === "premium",
      paystackCustomerCode: event.data.customer?.customer_code ?? null,
    }).where(eq(vendorsTable.id, vendorId));

    res.sendStatus(200);
    return;
  }

  if (event.event === "subscription.create") {
    const customerCode = event.data?.customer?.customer_code;
    if (customerCode) {
      await db.update(vendorsTable).set({
        paystackSubscriptionCode: event.data.subscription_code ?? null,
        paystackEmailToken: event.data.email_token ?? null,
      }).where(eq(vendorsTable.paystackCustomerCode, customerCode));
    }
    res.sendStatus(200);
    return;
  }

  if (event.event === "invoice.payment_failed" || event.event === "subscription.disable") {
    const subscriptionCode = event.data?.subscription?.subscription_code ?? event.data?.subscription_code;
    if (subscriptionCode) {
      await db.update(vendorsTable).set({
        plan: "free",
        verifiedSeller: false,
      }).where(eq(vendorsTable.paystackSubscriptionCode, subscriptionCode));
    }
    res.sendStatus(200);
    return;
  }

  if (event.event === "charge.success") {
    const reference = event.data?.reference;
    if (reference) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.paymentReference, reference));
      // Webhooks can arrive more than once; markOrderPaid is safe to repeat,
      // but skip anything already settled to avoid resetting the deadline.
      if (order && order.paymentStatus !== "paid") {
        await markOrderPaid(order.id, order.sessionId);
      }
    }
  }

  res.sendStatus(200);
});

router.post("/payments/flutterwave/webhook", async (req, res): Promise<void> => {
  const secretHash = process.env["FLUTTERWAVE_WEBHOOK_HASH"] ?? "";
  const signature = req.headers["verif-hash"] as string;

  if (secretHash && signature !== secretHash) {
    res.status(401).send("Invalid signature");
    return;
  }

  const event = req.body;
  if (event.status === "successful") {
    const txRef = event.data?.tx_ref;
    if (txRef) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.paymentReference, txRef));
      if (order && order.paymentStatus !== "paid") {
        await markOrderPaid(order.id, order.sessionId);
      }
    }
  }

  res.sendStatus(200);
});

router.post("/vendors/:id/subscribe", async (req, res): Promise<void> => {
  const vendorId = parseInt(req.params.id);
  const { email, tier } = req.body;

  if (!email || (tier !== "pro" && tier !== "premium")) {
    res.status(400).json({ error: "email and a valid tier ('pro' or 'premium') are required" });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const planCode = tier === "premium"
    ? process.env["PAYSTACK_PREMIUM_PLAN_CODE"]
    : process.env["PAYSTACK_PRO_PLAN_CODE"];

  if (!planCode) {
    res.status(500).json({ error: "Subscription plan not configured" });
    return;
  }

  const reference = `BH-SUB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  try {
    const tierAmount = tier === "premium" ? 200 : 80;
    const paystack = await initPaystackSubscription(email, planCode, tierAmount, reference, {
      type: "vendor_subscription",
      vendorId: vendor.id,
      tier,
    });

    res.json({
      vendorId: vendor.id,
      tier,
      reference,
      paymentUrl: paystack.authorization_url,
      accessCode: paystack.access_code,
      paystackPublicKey: PAYSTACK_PUBLIC_KEY,
    });
  } catch (err: any) {
    console.error("Subscription initialization failed:", err.message);
    res.status(502).json({ error: err.message ?? "Subscription initialization failed" });
  }
});

export default router;
