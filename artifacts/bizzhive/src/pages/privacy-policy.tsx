export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-display font-bold mb-6">Privacy Policy</h1>
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
            1. What we collect
          </h2>
          <p>
            Account details you provide (name, email, phone), seller storefront
            details (bio, location, Mobile Money details for payouts), and
            records of your orders and cart activity. We do not collect or store
            your card or Mobile Money PIN — those are handled directly by
            Paystack and Flutterwave.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            2. How we use it
          </h2>
          <p>
            To operate your account, process orders and payouts, communicate
            with you about your orders, and improve the marketplace. We do not
            sell your personal data to third parties.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            3. Sharing
          </h2>
          <p>
            We share the minimum necessary information with Paystack and
            Flutterwave to process payments, and with sellers/buyers as needed
            to fulfill an order (e.g. a seller sees a buyer's order details
            relevant to what they purchased).
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            4. Your rights
          </h2>
          <p>
            Under Ghana's Data Protection Act, 2012 (Act 843), you can request
            access to your data, ask us to correct inaccurate information,
            object to certain processing, and request erasure of your personal
            data. Where full deletion isn't possible (for example, because you
            have order history tied to other people's transactions), we
            anonymize your personal details instead of deleting the underlying
            records — removing your name, email, and phone while retaining only
            what's needed for legitimate business and financial records.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            5. Cookies & sessions
          </h2>
          <p>
            We use a session cookie to keep you logged in and to remember your
            cart. This is necessary for the site to function and isn't used for
            advertising or tracking across other websites.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            6. Children's privacy
          </h2>
          <p>
            BizzHive is not intended for use by anyone under 18. We do not
            knowingly collect data from minors.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            7. Contact
          </h2>
          <p>
            For any privacy request or concern, contact us at
            bizzhive001@gmail.com.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            8. Changes to this policy
          </h2>
          <p>
            We may update this policy from time to time; continued use of
            BizzHive after changes means you accept the update.
          </p>
        </section>
      </div>
    </div>
  );
}
