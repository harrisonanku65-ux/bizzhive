import { Router, type IRouter } from "express";
import { db, vendorsTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.paymentStatus !== "paid") {
    res.status(400).json({ error: "Order has not been paid" });
    return;
  }

  const items = order.items as any[];
  const vendorTotals = new Map<number, number>();

  for (const item of items) {
    const vendorId = item.vendorId;
    if (!vendorId) continue;
    vendorTotals.set(vendorId, (vendorTotals.get(vendorId) ?? 0) + item.price);
  }

  const payouts: any[] = [];

  for (const [vendorId, grossAmount] of vendorTotals) {
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
    if (!vendor) continue;

    const payoutPct = vendor.payoutPercentage ?? 80;
    const payoutAmount = Math.round(grossAmount * (payoutPct / 100) * 100) / 100;

    if (!PAYSTACK_SECRET_KEY || !vendor.momoNumber) {
      payouts.push({
        vendorId,
        vendorName: vendor.name,
        amount: payoutAmount,
        status: "demo",
        reference: `DEMO-${orderId}-${vendorId}`,
      });
      continue;
    }

    let recipientCode = vendor.paystackRecipientCode;
    if (!recipientCode) {
      recipientCode = await createPaystackRecipient(vendor);
    }

    if (!recipientCode) {
      payouts.push({ vendorId, vendorName: vendor.name, amount: payoutAmount, status: "failed_no_recipient", reference: "" });
      continue;
    }

    const payoutRef = `BH-PAYOUT-${orderId}-${vendorId}-${Date.now()}`;
    const result = await sendPaystackTransfer(payoutAmount, recipientCode, payoutRef, `BizzHive payout for order #${orderId}`);

    payouts.push({
      vendorId,
      vendorName: vendor.name,
      amount: payoutAmount,
      status: result.status === true ? "initiated" : "failed",
      reference: payoutRef,
    });
  }

  res.json({ orderId, payouts });
});

export default router;
