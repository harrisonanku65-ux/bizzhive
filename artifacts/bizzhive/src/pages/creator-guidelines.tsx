import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Store,
  BookOpen,
  ShoppingBag,
  Music,
  CalendarClock,
  ShieldCheck,
  Wallet,
  Star,
  Crown,
  AlertTriangle,
  LifeBuoy,
  FileText,
  Package,
  Code,
  Image,
  CheckCircle,
  XCircle,
} from "lucide-react";

/**
 * The seller handbook â€” consolidated tutorial content for every part of
 * selling on BizzHive, plus the community rules.
 *
 * Kept as one scrollable page with a contents list rather than split across
 * several thin pages, so sellers can search it with Ctrl+F and link people
 * straight to a section.
 */

const CONTENTS = [
  { id: "getting-started", label: "Getting started" },
  { id: "what-you-can-sell", label: "What you can sell" },
  { id: "courses", label: "Selling courses" },
  { id: "products", label: "Selling digital products" },
  { id: "product-types", label: "Choosing the right product type" },
  { id: "music", label: "Selling beats & music" },
  { id: "sessions", label: "Selling live sessions" },
  { id: "pricing", label: "Plans & listing limits" },
  { id: "payment", label: "How you get paid" },
  { id: "disputes", label: "If a buyer reports a problem" },
  { id: "reviews", label: "Reviews & responding" },
  { id: "rules", label: "Rules & enforcement" },
  { id: "support", label: "Getting help" },
];

const PRODUCT_TYPES = [
  {
    type: "Ebook",
    icon: BookOpen,
    what: "Something the buyer reads.",
    examples: "Guides, workbooks, recipe books, study notes, reports.",
  },
  {
    type: "Template",
    icon: FileText,
    what: "Something with a set structure the buyer fills in.",
    examples:
      "CVs, pitch decks, invoices, business plans, Canva layouts, social media kits.",
  },
  {
    type: "Software",
    icon: Code,
    what: "Something the buyer runs.",
    examples: "Scripts, plugins, apps, spreadsheets with working formulas, bots.",
  },
  {
    type: "Asset",
    icon: Image,
    what: "Raw material the buyer drops into their own project.",
    examples:
      "Logos, icons, illustrations, PSD/AI/Figma source files, stock photos, fonts, Lightroom & CapCut presets, video overlays, LUTs, game sprites, 3D models.",
  },
  {
    type: "Beat / Audio",
    icon: Music,
    what: "Anything the buyer needs to hear before buying.",
    examples: "Beats, instrumentals, sound effects, audio drops, jingles.",
  },
  {
    type: "Other",
    icon: Package,
    what: "Genuinely doesn't fit above.",
    examples: "Use sparingly â€” buyers filter by type, so this hides your work.",
  },
];

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: typeof Store;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">
          {title}
        </h2>
      </div>
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function CreatorGuidelines() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Badge className="mb-4 rounded-sm bg-primary/10 text-primary border-primary/20">
        Seller handbook
      </Badge>
      <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
        Creator Guidelines
      </h1>
      <p className="text-muted-foreground mb-8">
        Everything you need to sell on BizzHive â€” how each listing type works,
        how you get paid, and the rules everyone follows.
      </p>

      <Card className="mb-10 rounded-md shadow-none border-border/70">
        <CardContent className="p-5">
          <p className="text-sm font-medium mb-3">On this page</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {CONTENTS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-10">
        <Section id="getting-started" icon={Store} title="Getting started">
          <p>
            Sign up and choose <strong>Seller</strong> as your account type.
            That creates your storefront â€” a public page where everything you
            sell lives, along with your bio, location and rating.
          </p>
          <p>
            Before you can be paid, open your{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              Dashboard
            </Link>{" "}
            and add your Mobile Money number under payout settings. You can list
            without it, but payouts will fail until it's set.
          </p>
        </Section>

        <Separator />

        <Section
          id="what-you-can-sell"
          icon={CheckCircle}
          title="What you can sell"
        >
          <p>
            Online courses, digital products, beats and music, and live one-on-one
            sessions â€” anything you have full rights to distribute.
          </p>
          <p>
            If you didn't make it, you need written permission or a licence that
            allows resale. "I found it online" is not a licence.
          </p>
        </Section>

        <Separator />

        <Section id="courses" icon={BookOpen} title="Selling courses">
          <p>
            From your Dashboard, open <strong>My Courses â†’ New Course</strong>.
            Add a title, description, price, duration, level and category, and
            upload a thumbnail.
          </p>
          <p>
            After creating it, click <strong>Manage Lessons</strong> to add
            lessons one by one. Each lesson takes a title, a duration and a video
            link â€” YouTube (unlisted), Vimeo or Google Drive all work.
          </p>
          <p>
            Mark one or two lessons as a <strong>free preview</strong>. Buyers
            can watch those before paying, and courses with previews convert
            better because people can hear how you teach.
          </p>
        </Section>

        <Separator />

        <Section
          id="products"
          icon={ShoppingBag}
          title="Selling digital products"
        >
          <p>
            Go to <strong>My Products â†’ New Product</strong>. You upload two
            files: a <strong>thumbnail</strong> that buyers see while browsing,
            and the <strong>product file</strong> they download after paying.
          </p>
          <p>
            The product file is never public. It only becomes downloadable on the
            buyer's order once payment has gone through.
          </p>
        </Section>

        <Separator />

        <Section
          id="product-types"
          icon={Package}
          title="Choosing the right product type"
        >
          <p>
            Buyers filter by type, so picking the wrong one effectively hides
            your listing. The distinction is about{" "}
            <em>what the buyer does with it</em>:
          </p>

          <div className="space-y-3 not-prose">
            {PRODUCT_TYPES.map((pt) => {
              const Icon = pt.icon;
              return (
                <div
                  key={pt.type}
                  className="border border-border/60 rounded-md p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="font-semibold text-sm text-foreground">
                      {pt.type}
                    </p>
                  </div>
                  <p className="text-sm mb-1">{pt.what}</p>
                  <p className="text-sm text-muted-foreground">
                    {pt.examples}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="pt-1">
            <strong className="text-foreground">Template or Asset?</strong> If
            the value is in the layout and the buyer just swaps in their own
            text, it's a <strong>Template</strong>. If it's raw material with no
            prescribed use, it's an <strong>Asset</strong>. A ready-to-edit CV is
            a template; the icon set inside it is an asset.
          </p>
        </Section>

        <Separator />

        <Section id="music" icon={Music} title="Selling beats & music">
          <p>
            Choose the <strong>Beat / Audio</strong> product type and an extra
            panel appears with two fields that matter:
          </p>
          <p>
            <strong className="text-foreground">Preview clip</strong> â€” upload a
            short, tagged or watermarked sample. Buyers can play this before
            paying; the full file stays private. Nobody buys a beat they haven't
            heard, so listings without a preview rarely sell.
          </p>
          <p>
            <strong className="text-foreground">Licensing terms</strong> â€” spell
            out exactly what the buyer is allowed to do. Be specific about
            exclusivity, stream or sale caps, whether credit is required, and
            whether commercial use is included. For example: "Non-exclusive
            lease. Up to 100,000 streams. Credit required as 'prod. YourName'.
            Not for resale."
          </p>
          <p>
            Buyers agree to these terms at purchase, so vague licensing is what
            disputes are made of. Write it once, properly.
          </p>
        </Section>

        <Separator />

        <Section
          id="sessions"
          icon={CalendarClock}
          title="Selling live sessions"
        >
          <p>
            This is how coaching, mentorship, consultation calls and gaming
            coaching are sold. Go to{" "}
            <strong>Dashboard â†’ Availability â†’ New Slot</strong>.
          </p>
          <p>
            You publish <strong>specific times</strong>, not a general "I'm
            available" window. Each slot has a date and time, a duration, a price
            and a call link. Times are entered in your own timezone and shown to
            buyers in theirs.
          </p>
          <p>
            Your <strong>call link is private</strong>. It's only revealed to the
            buyer once they've paid â€” it never appears on public listings.
          </p>
          <p>
            When someone adds your slot to their cart it's held for 20 minutes so
            nobody else can take the same time. If they don't complete payment,
            it goes back on sale automatically.
          </p>
          <p>
            After the session happens, mark it <strong>delivered</strong>. The
            buyer then confirms and your payment is released. If you need to
            cancel a booked session, use Cancel and tell the buyer â€” they'll be
            refunded through support.
          </p>
        </Section>

        <Separator />

        <Section id="pricing" icon={Crown} title="Plans & listing limits">
          <p>
            Courses, products and session slots all count toward the same active
            listing limit:
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="w-full text-sm border border-border/60 rounded-md">
              <thead>
                <tr className="bg-muted/50 text-foreground text-left">
                  <th className="p-2.5 font-semibold">Plan</th>
                  <th className="p-2.5 font-semibold">Listings</th>
                  <th className="p-2.5 font-semibold">You also get</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/60">
                  <td className="p-2.5 font-medium text-foreground">Free</td>
                  <td className="p-2.5">1</td>
                  <td className="p-2.5">Storefront, secure checkout</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="p-2.5 font-medium text-foreground">Pro</td>
                  <td className="p-2.5">10</td>
                  <td className="p-2.5">
                    Sales analytics, priority placement, review management
                  </td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="p-2.5 font-medium text-foreground">Premium</td>
                  <td className="p-2.5">Unlimited</td>
                  <td className="p-2.5">
                    Verified badge, homepage feature, advanced analytics,
                    priority support
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Upgrade from the banner at the top of your Dashboard. If you hit the
            limit, you'll be told when you try to publish.
          </p>
        </Section>

        <Separator />

        <Section id="payment" icon={Wallet} title="How you get paid">
          <p>
            BizzHive holds the buyer's payment until delivery is settled â€” this
            is what makes buyers comfortable paying strangers, and it's the
            reason the marketplace works.
          </p>
          <p>Here's the sequence:</p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Buyer pays. The money is held, not yet yours.</li>
            <li>
              Buyer confirms they received what they paid for â€” or the hold
              expires on its own after a few days.
            </li>
            <li>
              Your share is transferred to your Mobile Money account
              automatically.
            </li>
          </ol>
          <p>
            You keep <strong>80%</strong> of each sale by default. You don't need
            to chase anything â€” if the buyer goes quiet, the payment releases to
            you automatically once the deadline passes.
          </p>
          <p>
            Deliver quickly and clearly. The faster a buyer is satisfied, the
            faster you're paid.
          </p>
        </Section>

        <Separator />

        <Section
          id="disputes"
          icon={ShieldCheck}
          title="If a buyer reports a problem"
        >
          <p>
            A buyer can raise an issue instead of confirming delivery. The
            payment stays on hold and our team reviews it.
          </p>
          <p>We can resolve it three ways:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Release to you</strong> â€” you
              delivered what you promised.
            </li>
            <li>
              <strong className="text-foreground">Refund the buyer</strong> â€”
              nothing was delivered.
            </li>
            <li>
              <strong className="text-foreground">Split it</strong> â€” partly
              delivered, so the buyer is partly refunded and you're paid on the
              rest.
            </li>
          </ul>
          <p>
            Your best protection is evidence. Accurate descriptions, working
            files, clear licensing terms and a written record of what you
            delivered all count in your favour. Most disputes come from
            expectations that were never written down.
          </p>
        </Section>

        <Separator />

        <Section id="reviews" icon={Star} title="Reviews & responding">
          <p>
            Buyers can review your courses, your products and your storefront
            itself. Ratings show on every listing, so they directly affect sales.
          </p>
          <p>
            Open <strong>Dashboard â†’ Reviews</strong> to see everything in one
            place, with a badge showing how many you haven't answered yet. You
            can post a public response to any of them.
          </p>
          <p>
            Respond to the critical ones especially. A calm, specific reply to a
            bad review reassures future buyers far more than the review itself
            damages you. Don't argue â€” explain what happened and what you did
            about it.
          </p>
        </Section>

        <Separator />

        <Section id="rules" icon={AlertTriangle} title="Rules & enforcement">
          <p className="font-medium text-foreground">Not allowed:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Pirated, stolen or resold content you don't have rights to</li>
            <li>
              Misleading titles, thumbnails or descriptions â€” including
              screenshots that aren't from your actual product
            </li>
            <li>Counterfeit goods, or accounts and items you can't deliver</li>
            <li>Fake reviews, or asking buyers to leave reviews in exchange for anything</li>
            <li>
              Taking buyers off-platform to avoid fees â€” it also removes their
              payment protection, and yours
            </li>
            <li>Anything that breaks Ghanaian law</li>
          </ul>

          <p className="font-medium text-foreground pt-2">Expected of you:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Accurate thumbnails, descriptions and pricing</li>
            <li>Working files and links â€” check them periodically</li>
            <li>Replies to buyer questions and reviews within a few days</li>
            <li>Showing up on time for sessions you've sold</li>
            <li>Keeping listings current, and unpublishing what you no longer offer</li>
          </ul>

          <p className="pt-2">
            Listings that break these rules are removed. Repeat violations lead
            to account suspension and withheld payouts on affected orders.
          </p>
        </Section>

        <Separator />

        <Section id="support" icon={LifeBuoy} title="Getting help">
          <p>
            Reach us through the{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact page
            </Link>
            . If you're signed in, your message is tagged with your plan â€” Pro
            sellers are answered within one business day, Premium sellers within
            a few hours.
          </p>
          <p>
            For anything about a specific order, include the order number. It
            saves a round trip.
          </p>
        </Section>
      </div>

      <Card className="mt-12 rounded-md shadow-none border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-6 text-center">
          <XCircle className="h-6 w-6 text-primary mx-auto mb-3" />
          <p className="font-semibold mb-1">Still not sure about something?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Ask before you list. It's much easier than unpicking a dispute later.
          </p>
          <Link href="/contact" className="text-primary text-sm hover:underline">
            Contact support
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
