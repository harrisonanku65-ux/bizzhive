export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-display font-bold mb-6">
        Terms & Conditions
      </h1>
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
            1. Overview
          </h2>
          <p>
            BizzHive is a marketplace connecting Ghanaian creators with buyers
            of courses, digital products, and freelance services. By using this
            site, you agree to these terms.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            2. Accounts
          </h2>
          <p>
            You're responsible for keeping your account credentials secure and
            for all activity under your account. You may delete your account at
            any time from your account settings.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            3. Payments
          </h2>
          <p>
            Payments are processed via Paystack and Flutterwave. BizzHive does
            not store your card or Mobile Money credentials directly.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            4. Payment holding & delivery confirmation
          </h2>
          <p>
            When you complete a purchase, your payment is held before being
            released to the seller. Once you receive your course or product,
            click "Confirm Delivery" to release payment to the seller. If you
            don't confirm and don't report an issue, payment is automatically
            released to the seller after 3 days. If something is wrong, use
            "Report an Issue" within that window instead of confirming — this
            pauses release while we review the matter.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            5. Subscriptions
          </h2>
          <p>
            Pro and Premium seller plans are billed monthly via Paystack.
            Subscriptions renew automatically until cancelled. Cancelling stops
            future billing but does not refund the current billing period.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            6. Seller responsibilities
          </h2>
          <p>
            Sellers are responsible for the accuracy, quality, and legality of
            the content and services they list, per our Creator Guidelines.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            7. Refunds
          </h2>
          <p>
            See our{" "}
            <a href="/refund-policy" className="text-primary underline">
              Refund Policy
            </a>{" "}
            for details on when and how refunds are handled.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            8. Your data
          </h2>
          <p>
            See our{" "}
            <a href="/privacy-policy" className="text-primary underline">
              Privacy Policy
            </a>{" "}
            for how we collect, use, and protect your personal information.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            9. Changes to these terms
          </h2>
          <p>
            We may update these terms from time to time; continued use of
            BizzHive after changes means you accept the update.
          </p>
        </section>
      </div>
    </div>
  );
}
