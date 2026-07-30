import { Link } from "wouter";

export default function HelpCenter() {
  const faqs = [
    {
      q: "How do I buy a course or product?",
      a: "Browse Courses or Digital Products, add items to your cart, and check out with card or Mobile Money via Paystack or Flutterwave.",
    },
    {
      q: "Is my money safe when I pay?",
      a: "Yes. BizzHive holds your payment until you confirm you received what you paid for. The seller isn't paid until then.",
    },
    {
      q: "What if I don't get what I paid for?",
      a: "Go to My Orders and click 'Report a problem' instead of confirming delivery. Your payment stays on hold while our team reviews it, and we can release it to the seller, refund you in full, or split it if only part was delivered.",
    },
    {
      q: "What happens if I forget to confirm delivery?",
      a: "The payment releases to the seller automatically a few days after purchase. If something is wrong, report it before then.",
    },
    {
      q: "How do I book a coaching or consultation session?",
      a: "Go to Book a Session, pick a time that suits you and reserve it. The slot is held for 20 minutes while you check out. Once you've paid, the call link appears under My Bookings.",
    },
    {
      q: "How do sellers get paid?",
      a: "Sellers add Mobile Money details in their dashboard. Once delivery is confirmed, their share is transferred to their MoMo account automatically.",
    },
    {
      q: "I found a bug or issue â€” who do I contact?",
      a: "Reach out via the Contact Us page and we'll get back to you as soon as we can.",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">Support</span>
      <h1 className="text-3xl font-display font-bold mt-2 mb-6">Help Center</h1>
      <div className="space-y-6">
        {faqs.map((f, i) => (
          <div key={i}>
            <h2 className="text-lg font-semibold mb-1">{f.q}</h2>
            <p className="text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-border/60 pt-6">
        <p className="text-sm text-muted-foreground">
          Selling on BizzHive? The{" "}
          <Link
            href="/creator-guidelines"
            className="text-primary hover:underline"
          >
            Creator Guidelines
          </Link>{" "}
          cover listing types, payouts, disputes and the rules in full.
        </p>
      </div>
    </div>
  );
}
