import { Link } from "wouter";
import { useGetFeaturedContent, useListCategories, useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  BookOpen,
  Users,
  ShoppingBag,
  ArrowRight,
  Compass,
  GraduationCap,
  Wallet,
  TrendingUp,
} from "lucide-react";

const STEPS = [
  {
    icon: Compass,
    title: "Discover",
    description: "Browse courses, digital products, and bookable sessions from verified Ghanaian creators across every category.",
  },
  {
    icon: GraduationCap,
    title: "Learn & Build",
    description: "Enroll instantly, download your files, or book a session — everything is delivered and tracked inside your dashboard.",
  },
  {
    icon: Wallet,
    title: "Sell & Earn",
    description: "List your own courses or products in minutes. Payouts are held in escrow and released in GHS once delivery is confirmed.",
  },
];

export default function Home() {
  const { data: featured, isLoading } = useGetFeaturedContent();
  const { data: categories } = useListCategories();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();

  return (
    <div>
      {/* Hero — light canvas, two-column split: headline + CTA left, live stats widget right */}
      <section className="border-b border-border/60 bg-muted/20">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Ghana's Creative Marketplace
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
                Learn, create, and <span className="text-primary">earn</span> — all on BizzHive
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                The marketplace where Ghanaian creators sell courses, digital products, and freelance services. Join thousands of entrepreneurs building their future.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                <Link href="/courses">
                  <Button size="lg" className="font-semibold text-base px-8">
                    Browse Courses <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="lg" className="font-semibold text-base px-8">
                    Start Selling
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                No listing fees to start &middot; Payouts held in escrow &middot; Priced in GHS
              </p>
            </div>

            {/* Floating stats widget */}
            <div className="relative">
              <div className="rounded-lg border border-border/70 bg-card shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Marketplace, live
                  </span>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="grid grid-cols-3 divide-x divide-border/60">
                  <div className="p-5 flex flex-col items-start gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {statsLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <span className="text-2xl font-bold font-display leading-none">{(stats?.totalCourses ?? 0).toLocaleString()}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground leading-tight">Online Courses</span>
                  </div>
                  <div className="p-5 flex flex-col items-start gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    {statsLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <span className="text-2xl font-bold font-display leading-none">{(stats?.totalProducts ?? 0).toLocaleString()}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground leading-tight">Digital Products</span>
                  </div>
                  <div className="p-5 flex flex-col items-start gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    {statsLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <span className="text-2xl font-bold font-display leading-none">{(stats?.totalVendors ?? 0).toLocaleString()}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground leading-tight">Expert Creators</span>
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-border/60 bg-muted/30">
                  <div className="flex items-end gap-1 h-8">
                    {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/25 rounded-[2px]" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Browse</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold mt-2 mb-8">Shop by category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/courses?categoryId=${cat.id}`}>
                  <Card className="group cursor-pointer rounded-md border-border/70 shadow-none hover:border-primary/40 hover:shadow-sm transition-all h-full">
                    <CardContent className="p-5 text-center flex flex-col h-full">
                      <div className="w-11 h-11 mx-auto mb-3 rounded-md bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-sm">{cat.name}</h3>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{cat.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground/80 mt-auto pt-2">{cat.courseCount + cat.productCount} items</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works — editorial three-up, hairline dividers */}
      <section className="py-16 md:py-20 bg-muted/20 border-y border-border/60">
        <div className="container mx-auto px-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">How it works</span>
          <h2 className="text-2xl md:text-3xl font-display font-bold mt-2 mb-10 max-w-lg">Everything you need to learn or launch</h2>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60 border-t border-border/60 md:border-t-0">
            {STEPS.map((step, i) => (
              <div key={step.title} className="py-8 md:py-0 md:px-8 first:pl-0 first:pt-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <step.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Featured</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold mt-2">Featured courses</h2>
            </div>
            <Link href="/courses">
              <Button variant="ghost" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => <Skeleton key={i} className="h-80 rounded-md" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured?.featuredCourses?.slice(0, 6).map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <Card className="group overflow-hidden cursor-pointer rounded-md shadow-none border-border/70 hover:border-primary/40 hover:shadow-md transition-all">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <BookOpen className="h-12 w-12 text-primary/40" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 rounded-sm">{course.level}</Badge>
                    </div>
                    <CardContent className="p-5">
                      <p className="text-xs text-muted-foreground mb-1">{course.categoryName}</p>
                      <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{course.vendorName}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-medium">{course.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">({course.reviewsCount} reviews)</span>
                        <span className="text-xs text-muted-foreground ml-auto">{course.lessonsCount} lessons</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border/60">
                        <span className="text-lg font-bold text-primary font-display">GHS {course.price.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">{course.enrollments} enrolled</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted/20 border-y border-border/60">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Marketplace</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold mt-2">Digital products</h2>
            </div>
            <Link href="/products">
              <Button variant="ghost" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-60 rounded-md" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured?.featuredProducts?.slice(0, 4).map((product) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="group overflow-hidden cursor-pointer rounded-md shadow-none border-border/70 bg-card hover:border-primary/40 hover:shadow-md transition-all">
                    <div className="aspect-[4/3] bg-gradient-to-br from-secondary/20 to-primary/10 relative">
                      {product.thumbnail ? (
                        <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ShoppingBag className="h-10 w-10 text-primary/40" />
                        </div>
                      )}
                      <Badge variant="secondary" className="absolute top-3 left-3 rounded-sm">{product.productType}</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">{product.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{product.vendorName}</p>
                      <span className="text-base font-bold text-primary font-display">GHS {product.price.toFixed(2)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {featured?.topVendors && featured.topVendors.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Community</span>
                <h2 className="text-2xl md:text-3xl font-display font-bold mt-2">Top creators</h2>
              </div>
              <Link href="/vendors">
                <Button variant="ghost" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.topVendors.map((vendor) => (
                <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
                  <Card className="group cursor-pointer rounded-md shadow-none border-border/70 hover:border-primary/40 hover:shadow-md transition-all">
                    <CardContent className="p-6 text-center">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold font-display">
                        {vendor.name.charAt(0)}
                      </div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{vendor.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{vendor.location}</p>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium">{vendor.rating.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{vendor.totalCourses} courses &middot; {vendor.totalProducts} products</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA — dark band, reserved surface-ink per design system */}
      <section className="surface-ink honeycomb py-16 md:py-20">
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to share your knowledge?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join BizzHive as a creator. Sell courses, digital products, and offer your expertise to thousands of learners across Ghana.
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="font-semibold text-base px-8 bg-background text-foreground hover:bg-background/90">
              Become a Creator <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
