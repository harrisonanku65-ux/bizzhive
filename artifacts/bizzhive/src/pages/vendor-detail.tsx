import { useParams } from "wouter";
import { Link } from "wouter";
import { useGetVendor, useListCourses, useListProducts, useGetVendorStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MapPin, BookOpen, ShoppingBag, Users } from "lucide-react";

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const vendorId = parseInt(id || "0");
  const { data: vendor, isLoading } = useGetVendor(vendorId);
  const { data: courses } = useListCourses({ vendorId });
  const { data: products } = useListProducts({ vendorId });
  const { data: stats } = useGetVendorStats(vendorId);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8"><Skeleton className="h-64" /></div>;
  }

  if (!vendor) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Creator not found</h2>
        <Link href="/vendors"><Button>Browse Creators</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold font-display flex-shrink-0">
            {vendor.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-display font-bold">{vendor.name}</h1>
              {vendor.featured && <Badge className="bg-accent text-accent-foreground">Featured Creator</Badge>}
            </div>
            {vendor.location && (
              <div className="flex items-center gap-1 text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                <span>{vendor.location}</span>
              </div>
            )}
            {vendor.bio && <p className="text-muted-foreground max-w-2xl mb-4">{vendor.bio}</p>}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-medium">{vendor.rating.toFixed(1)}</span>
              </div>
              <span className="text-sm text-muted-foreground">{stats?.totalCourses ?? vendor.totalCourses} courses</span>
              <span className="text-sm text-muted-foreground">{stats?.totalProducts ?? vendor.totalProducts} products</span>
              <span className="text-sm text-muted-foreground">{stats?.totalEnrollments ?? 0} students</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="courses">
        <TabsList className="mb-6">
          <TabsTrigger value="courses">Courses ({courses?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="products">Products ({products?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <Card className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all h-full">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative">
                      <div className="flex items-center justify-center h-full">
                        <BookOpen className="h-12 w-12 text-primary/40" />
                      </div>
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">{course.level}</Badge>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors">{course.title}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm">{course.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{course.lessonsCount} lessons</span>
                      </div>
                      <span className="text-lg font-bold text-primary font-display">GHS {course.price.toFixed(2)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No courses yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products">
          {products && products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all h-full">
                    <div className="aspect-[4/3] bg-gradient-to-br from-secondary/20 to-primary/10 relative">
                      <div className="flex items-center justify-center h-full">
                        <ShoppingBag className="h-10 w-10 text-primary/40" />
                      </div>
                      <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground">{product.productType}</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">{product.title}</h3>
                      <span className="text-base font-bold text-primary font-display">GHS {product.price.toFixed(2)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No products yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
