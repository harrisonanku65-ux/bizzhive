export default function RefundPolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-display font-bold mb-6">Refund Policy</h1>
      <div className="space-y-6 text-muted-foreground text-sm">
        <p>
          Last updated:{" "}
          {new Date().toLocaleDateString("en-GH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            1. How payments are held
          </h2>
          <p>
            When you buy a course or product, your payment is held for up to 14
            days before being released to the seller, giving you time to confirm
            you received what you paid for.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            2. Before you confirm delivery
          </h2>
          <p>
            If there's a problem with your order, use "Report an Issue" from
            your Orders page within the 14-day window instead of confirming
            delivery. This pauses the payment release while we review your case,
            and we'll work with you and the seller toward a resolution, which
            may include a refund.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            3. After payment has been released
          </h2>
          <p>
            Once you've confirmed delivery, or the 14-day window has passed,
            payment has already been sent to the seller. Refunds at this stage
            are handled case by case and may require the seller's cooperation —
            contact us and we'll help mediate.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            4. Subscription plans
          </h2>
          <p>
            Pro and Premium seller subscriptions are billed monthly and are
            generally non-refundable for the current billing period once it has
            started. You can cancel anytime to stop future renewals.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            5. How to request a refund
          </h2>
          <p>
            Contact us at bizzhive001@gmail.com or via WhatsApp with your order
            reference and a description of the issue.
          </p>
        </section>
      </div>
    </div>
  );
}
