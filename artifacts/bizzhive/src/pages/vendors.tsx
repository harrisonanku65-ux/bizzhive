import { Link } from "wouter";
import { useListVendors } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, Users } from "lucide-react";

export default function Vendors() {
  const { data: vendors, isLoading } = useListVendors();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Community</span>
        <h1 className="text-3xl font-display font-bold mt-2 mb-2">Creators</h1>
        <p className="text-muted-foreground">Meet the talented creators powering BizzHive</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-md" />)}
        </div>
      ) : vendors && vendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
              <Card className="group cursor-pointer rounded-md shadow-none border-border/70 hover:border-primary/40 hover:shadow-md transition-all h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold font-display flex-shrink-0">
                      {vendor.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{vendor.name}</h3>
                        {vendor.featured && <Badge className="bg-accent text-accent-foreground text-xs rounded-sm">Featured</Badge>}
                      </div>
                      {vendor.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{vendor.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium">{vendor.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  {vendor.bio && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{vendor.bio}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/60 text-sm text-muted-foreground">
                    <span>{vendor.totalCourses} courses</span>
                    <span>{vendor.totalProducts} products</span>
                    <span className="ml-auto">{vendor.totalSales} sales</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No creators found</h3>
          <p className="text-muted-foreground text-sm">Check back soon for new creators</p>
        </div>
      )}
    </div>
  );
}
