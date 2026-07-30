import { Link } from "wouter";

export default function HowToSell() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">Selling</span>
      <h1 className="text-3xl font-display font-bold mt-2 mb-3">
        How to Sell on BizzHive
      </h1>
      <p className="text-muted-foreground mb-8">
        The four steps to your first sale. For the full detail on each listing
        type, payouts and the rules, read the{" "}
        <Link href="/creator-guidelines" className="text-primary hover:underline">
          Creator Guidelines
        </Link>
        .
      </p>
      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            1. Create your seller account
          </h2>
          <p>
            Sign up and choose "Seller" as your account type. You'll get a
            vendor storefront where all your courses and products live.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            2. List your first course, product or session
          </h2>
          <p>
            From your Dashboard, click "New Course," "New Product," or â€” for
            coaching and consultation calls â€” "New Slot" under Availability. Add
            a title, description, price and thumbnail. For products, also upload
            the actual file buyers will download.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            3. Choose your plan
          </h2>
          <p>
            Free accounts can list 1 item. Upgrade to Pro or Premium from your
            dashboard for more listings, priority placement, and (on Premium) a
            verified badge.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            4. Get paid
          </h2>
          <p>
            Add your Mobile Money details in your dashboard's payout settings.
            BizzHive holds each payment until the buyer confirms delivery â€” or
            until the hold expires on its own after a few days â€” then transfers
            your share (80% by default) to your MoMo account automatically.
          </p>
        </section>
      </div>
    </div>
  );
}
