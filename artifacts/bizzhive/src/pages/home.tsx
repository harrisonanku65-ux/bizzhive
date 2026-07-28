import { Link } from "wouter";
import { useGetFeaturedContent, useListCategories, useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, BookOpen, Users, ShoppingBag, ArrowRight } from "lucide-react";

export default function Home() {
  const { data: featured, isLoading } = useGetFeaturedContent();
  const { data: categories } = useListCategories();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">Ghana's Creative Marketplace</Badge>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-foreground mb-6 leading-tight">
              Learn, Create, <span className="text-primary">Earn</span> — All on BizzHive
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              The marketplace where Ghanaian creators sell courses, digital products, and freelance services. Join thousands of entrepreneurs building their future.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/courses">
                <Button size="lg" className="rounded-full font-semibold text-base px-8">
                  Browse Courses <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="rounded-full font-semibold text-base px-8">
                  Start Selling
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 bottom-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      </section>

      <section className="py-8 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <BookOpen className="h-5 w-5 text-primary mb-1" />
              {statsLoading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-bold font-display">{(stats?.totalCourses ?? 0).toLocaleString()}</span>
              )}
              <span className="text-xs text-muted-foreground">Online Courses</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShoppingBag className="h-5 w-5 text-primary mb-1" />
              {statsLoading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-bold font-display">{(stats?.totalProducts ?? 0).toLocaleString()}</span>
              )}
              <span className="text-xs text-muted-foreground">Digital Products</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Users className="h-5 w-5 text-primary mb-1" />
              {statsLoading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-bold font-display">{(stats?.totalVendors ?? 0).toLocaleString()}</span>
              )}
              <span className="text-xs text-muted-foreground">Expert Creators</span>
            </div>
          </div>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-8">Browse Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/courses?categoryId=${cat.id}`}>
                  <Card className="group cursor-pointer hover:border-primary/40 transition-all hover:shadow-md">
                    <CardContent className="p-5 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold text-sm">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{cat.courseCount + cat.productCount} items</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-12 md:py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold">Featured Courses</h2>
            <Link href="/courses">
              <Button variant="ghost" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured?.featuredCourses?.slice(0, 6).map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <Card className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all border-border/60 hover:border-primary/30">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <BookOpen className="h-12 w-12 text-primary/40" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">{course.level}</Badge>
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
                      <div className="flex items-center justify-between pt-3 border-t border-border/40">
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

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold">Digital Products</h2>
            <Link href="/products">
              <Button variant="ghost" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-60 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured?.featuredProducts?.slice(0, 4).map((product) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all border-border/60 hover:border-primary/30">
                    <div className="aspect-[4/3] bg-gradient-to-br from-secondary/20 to-primary/10 relative">
                      {product.thumbnail ? (
                        <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ShoppingBag className="h-10 w-10 text-primary/40" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground">{product.productType}</Badge>
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
        <section className="py-12 md:py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-bold">Top Creators</h2>
              <Link href="/vendors">
                <Button variant="ghost" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.topVendors.map((vendor) => (
                <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
                  <Card className="group cursor-pointer hover:shadow-lg transition-all border-border/60 hover:border-primary/30">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold font-display">
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

      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to share your knowledge?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">Join BizzHive as a creator. Sell courses, digital products, and offer your expertise to thousands of learners across Ghana.</p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="rounded-full font-semibold text-base px-8">
              Become a Creator <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
