import { Link } from "wouter";
import { useListCategories } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Gamepad2,
  Gift,
  ShieldCheck,
  Users,
  BookOpen,
  Monitor,
  Trophy,
  ArrowRight,
} from "lucide-react";

export default function GamingHub() {
  const { data: categories } = useListCategories();
  const categoryId = categories?.find((c) => c.slug === "gaming")?.id;

  const offers = [
    {
      icon: Gift,
      title: "Game Top-Ups & Gift Cards",
      description:
        "Free Fire diamonds, Mobile Legends, PUBG UC, Google Play, Steam, Xbox and PlayStation gift cards.",
      href: categoryId ? `/products?categoryId=${categoryId}` : "/products",
      cta: "Browse Top-Ups",
    },
    {
      icon: ShieldCheck,
      title: "Game Accounts",
      description:
        "Buy verified high-rank accounts for Mobile Legends, PUBG, FIFA and more.",
      href: categoryId ? `/products?categoryId=${categoryId}` : "/products",
      cta: "Browse Accounts",
    },
    {
      icon: Trophy,
      title: "Gaming Coaching",
      description:
        "Learn from Ghana's best players. Rank up faster with 1-on-1 coaching sessions.",
      // Points at real bookable slots rather than a generic vendor list.
      href: categoryId ? `/sessions?categoryId=${categoryId}` : "/sessions",
      cta: "Book a Session",
    },
    {
      icon: BookOpen,
      title: "Guides & Strategies",
      description:
        "PDF guides, video walkthroughs, and beginner-to-pro course packages.",
      href: categoryId ? `/courses?categoryId=${categoryId}` : "/courses",
      cta: "Browse Guides",
    },
    {
      icon: Monitor,
      title: "Game Setups & Tech Support",
      description:
        "PC setup consultation, streaming tutorials, and low-latency optimisation guides.",
      href: categoryId ? `/sessions?categoryId=${categoryId}` : "/sessions",
      cta: "Book a Consultation",
    },
    {
      icon: Users,
      title: "Tournaments & Community",
      description: "Private tournaments and esports team coaching.",
      href: "/vendors",
      cta: "Find Organisers",
    },
  ];

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Gaming Hub
          </Badge>
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4 flex items-center gap-3">
            <Gamepad2 className="h-9 w-9 text-primary" /> Level Up on BizzHive
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Ghana's first dedicated gaming marketplace — top-ups, verified
            accounts, coaching and guides. Safe, fast and trusted.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {offers.map((offer) => {
            const Icon = offer.icon;
            return (
              <Card
                key={offer.title}
                className="hover:border-primary/40 transition-all hover:shadow-md"
              >
                <CardContent className="p-6">
                  <Icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">{offer.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {offer.description}
                  </p>
                  <Link href={offer.href}>
                    <Button
                      variant="ghost"
                      className="text-primary p-0 h-auto hover:bg-transparent"
                    >
                      {offer.cta} <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="py-12 md:py-16 bg-muted/20 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
            Sell to Ghana's gaming community
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            List top-ups, accounts, guides or coaching. Payment is held securely
            until the buyer confirms delivery, so both sides are protected.
          </p>
          <Link href="/signup?role=seller">
            <Button size="lg" className="rounded-full">
              Start Selling <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
