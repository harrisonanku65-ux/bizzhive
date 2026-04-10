import { Router, type IRouter } from "express";
import { db, cartItemsTable, coursesTable, productsTable, vendorsTable, ordersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const PAYSTACK_SECRET_KEY = process.env["PAYSTACK_SECRET_KEY"] ?? "";
const FLUTTERWAVE_SECRET_KEY = process.env["FLUTTERWAVE_SECRET_KEY"] ?? "";
const PAYSTACK_PUBLIC_KEY = process.env["PAYSTACK_PUBLIC_KEY"] ?? "";
const FLUTTERWAVE_PUBLIC_KEY = process.env["FLUTTERWAVE_PUBLIC_KEY"] ?? "";

function getSessionId(req: any): string {
  if (!req.cookies?.session_id) {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    req.res.cookie("session_id", id, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return id;
  }
  return req.cookies.session_id;
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
    payment_options: "card,mobilemoneygm",
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

  const reference = `BH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const [order] = await db.insert(ordersTable).values({
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
    await db.update(ordersTable).set({ paymentStatus: "paid", status: "completed" }).where(eq(ordersTable.id, order.id));
    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
    res.json({ status: "success", orderId: order.id, reference, message: "Payment verified (demo mode)", payoutScheduled: false });
    return;
  }

  const resp = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });

  const data: any = await resp.json();

  if (data.status && data.data?.status === "success") {
    await db.update(ordersTable).set({ paymentStatus: "paid", status: "completed" }).where(eq(ordersTable.id, order.id));
    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
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
    await db.update(ordersTable).set({ paymentStatus: "paid", status: "completed" }).where(eq(ordersTable.id, order.id));
    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
    res.json({ status: "success", orderId: order.id, reference, message: "Payment verified (demo mode)", payoutScheduled: false });
    return;
  }

  const resp = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`, "Content-Type": "application/json" },
  });

  const data: any = await resp.json();

  if (data.status === "success" && data.data?.status === "successful") {
    await db.update(ordersTable).set({ paymentStatus: "paid", status: "completed" }).where(eq(ordersTable.id, order.id));
    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
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
  if (event.event === "charge.success") {
    const reference = event.data?.reference;
    if (reference) {
      await db.update(ordersTable).set({ paymentStatus: "paid", status: "completed" }).where(eq(ordersTable.paymentReference, reference));
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.paymentReference, reference));
      if (order) {
        await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, order.sessionId));
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
      await db.update(ordersTable).set({ paymentStatus: "paid", status: "completed" }).where(eq(ordersTable.paymentReference, txRef));
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.paymentReference, txRef));
      if (order) {
        await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, order.sessionId));
      }
    }
  }

  res.sendStatus(200);
});

export default router;
