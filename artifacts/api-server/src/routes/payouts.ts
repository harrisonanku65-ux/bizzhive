import { Router, type IRouter } from "express";
import { db, vendorsTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireOwnVendorId } from "../middlewares/requireVendor";

const router: IRouter = Router();

const PAYSTACK_SECRET_KEY = process.env["PAYSTACK_SECRET_KEY"] ?? "";

const MOMO_NETWORK_CODES: Record<string, string> = {
  MTN: "mtn",
  Vodafone: "vod",
  AirtelTigo: "atl",
};

async function createPaystackRecipient(vendor: any) {
  if (!vendor.momoNumber || !vendor.momoNetwork) return null;

  const body = {
    type: "mobile_money",
    name: vendor.name,
    account_number: vendor.momoNumber,
    bank_code: MOMO_NETWORK_CODES[vendor.momoNetwork] ?? vendor.momoNetwork.toLowerCase(),
    currency: "GHS",
    description: `Payout for ${vendor.name}`,
  };

  const resp = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: any = await resp.json();
  if (data.status) {
    const recipientCode = data.data?.recipient_code;
    if (recipientCode) {
      await db.update(vendorsTable).set({ paystackRecipientCode: recipientCode }).where(eq(vendorsTable.id, vendor.id));
    }
    return recipientCode;
  }
  return null;
}

async function sendPaystackTransfer(amount: number, recipientCode: string, reference: string, reason: string) {
  const body = {
    source: "balance",
    amount: Math.round(amount * 100),
    recipient: recipientCode,
    reason,
    reference,
    currency: "GHS",
  };

  const resp = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: any = await resp.json();
  return data;
}

router.put("/vendors/:vendorId/payout-settings", async (req, res): Promise<void> => {
  const vendorId = parseInt(req.params.vendorId);
  const { momoNumber, momoNetwork, email } = req.body;

  const requesterVendorId = await requireOwnVendorId(req, res);
  if (requesterVendorId === null) return;
  if (requesterVendorId !== vendorId) {
    res.status(403).json({ error: "You can only update your own payout settings" });
    return;
  }

  if (!momoNumber || !momoNetwork) {
    res.status(400).json({ error: "momoNumber and momoNetwork are required" });
    return;
  }

  await db.update(vendorsTable).set({
    momoNumber,
    momoNetwork,
    ...(email ? { email } : {}),
    paystackRecipientCode: null,
  }).where(eq(vendorsTable.id, vendorId));

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  let recipientCode: string | null = null;
  if (PAYSTACK_SECRET_KEY) {
    try {
      recipientCode = await createPaystackRecipient(vendor);
    } catch (err) {
      console.error("Failed to create Paystack recipient:", err);
    }
  }

  res.json({
    vendorId,
    momoNumber,
    momoNetwork,
    email: email ?? vendor.email,
    payoutPercentage: vendor.payoutPercentage,
    paystackRecipientCode: recipientCode,
  });
});

router.post("/payouts/process/:orderId", async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.orderId);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.paymentStatus !== "paid") { res.status(400).json({ error: "Order has not been paid" }); return; }
  if (order.deliveryStatus === "disputed") { res.status(400).json({ error: "Order is under dispute" }); return; }

  const result = await processPayoutForOrder(orderId);
  res.json(result);
});

/**
 * Issues a refund back to the buyer through the original payment provider.
 *
 * Paystack refunds are asynchronous — the API acknowledges the request and the
 * money lands back on the customer's card/MoMo later, so a successful response
 * here means "refund accepted", not "refund settled".
 *
 * Pass `amount` to refund part of the order; omit it for a full refund.
 */
export async function refundOrder(orderId: number, amount?: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return { status: "failed", reason: "order_not_found" };
  if (order.paymentStatus !== "paid") return { status: "failed", reason: "order_not_paid" };
  if (!order.paymentReference) return { status: "failed", reason: "no_payment_reference" };

  const refundAmount = amount ?? order.total;
  if (refundAmount <= 0) return { status: "failed", reason: "invalid_amount" };
  if (refundAmount > order.total - order.refundedAmount) {
    return { status: "failed", reason: "exceeds_refundable_amount" };
  }

  // Without live keys (local/dev) record the intent so the flow is still
  // testable end to end instead of silently doing nothing.
  if (!PAYSTACK_SECRET_KEY || order.paymentProvider !== "paystack") {
    return {
      status: "demo",
      amount: refundAmount,
      reference: `DEMO-REFUND-${orderId}-${Date.now()}`,
      provider: order.paymentProvider ?? "unknown",
    };
  }

  const resp = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: order.paymentReference,
      amount: Math.round(refundAmount * 100),
      currency: order.currency ?? "GHS",
      merchant_note: `BizzHive dispute resolution for order #${orderId}`,
    }),
  });

  const data: any = await resp.json();
  return {
    status: data.status === true ? "initiated" : "failed",
    amount: refundAmount,
    reference: data.data?.id ? String(data.data.id) : "",
    provider: "paystack",
    providerMessage: data.message ?? null,
  };
}

/**
 * Pays each vendor their share of an order.
 *
 * `payoutRatio` scales every vendor's gross down — used after a partial refund
 * so the seller is paid on what the buyer actually kept, not the original
 * order total. A ratio of 0 skips payout entirely (full refund case).
 */
export async function processPayoutForOrder(orderId: number, payoutRatio = 1) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || order.paymentStatus !== "paid") return null;
  if (order.payoutStatus === "processed") return { orderId, payouts: order.payoutResults ?? [], alreadyProcessed: true };

  if (payoutRatio <= 0) {
    await db.update(ordersTable).set({
      payoutStatus: "processed",
      payoutResults: [],
      payoutProcessedAt: new Date(),
    }).where(eq(ordersTable.id, orderId));
    return { orderId, payouts: [] };
  }

  const items = order.items as any[];
  const vendorTotals = new Map<number, number>();
  for (const item of items) {
    if (!item.vendorId) continue;
    vendorTotals.set(item.vendorId, (vendorTotals.get(item.vendorId) ?? 0) + item.price * payoutRatio);
  }

  const payouts: any[] = [];
  for (const [vendorId, grossAmount] of vendorTotals) {
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
    if (!vendor) continue;

    const payoutPct = vendor.payoutPercentage ?? 80;
    const payoutAmount = Math.round(grossAmount * (payoutPct / 100) * 100) / 100;

    if (!PAYSTACK_SECRET_KEY || !vendor.momoNumber) {
      payouts.push({ vendorId, vendorName: vendor.name, amount: payoutAmount, status: "demo", reference: `DEMO-${orderId}-${vendorId}` });
      continue;
    }

    let recipientCode = vendor.paystackRecipientCode;
    if (!recipientCode) recipientCode = await createPaystackRecipient(vendor);
    if (!recipientCode) {
      payouts.push({ vendorId, vendorName: vendor.name, amount: payoutAmount, status: "failed_no_recipient", reference: "" });
      continue;
    }

    const payoutRef = `BH-PAYOUT-${orderId}-${vendorId}-${Date.now()}`;
    const result = await sendPaystackTransfer(payoutAmount, recipientCode, payoutRef, `BizzHive payout for order #${orderId}`);
    payouts.push({ vendorId, vendorName: vendor.name, amount: payoutAmount, status: result.status === true ? "initiated" : "failed", reference: payoutRef });
  }

  await db.update(ordersTable).set({
    payoutStatus: "processed",
    payoutResults: payouts,
    payoutProcessedAt: new Date(),
  }).where(eq(ordersTable.id, orderId));

  return { orderId, payouts };
}



export default router;
