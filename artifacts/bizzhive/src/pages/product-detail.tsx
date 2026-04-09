import { useParams } from "wouter";
import { Link } from "wouter";
import { useGetProduct, useAddToCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Star, ShoppingBag, ShoppingCart, CheckCircle, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id || "0");
  const { data: product, isLoading } = useGetProduct(productId, { query: { enabled: !!productId } });
  const addToCart = useAddToCart();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-64 mb-4" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Product not found</h2>
        <Link href="/products"><Button>Browse Products</Button></Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart.mutate({ data: { itemType: "product", itemId: product.id } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }); }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-2">
            <Badge variant="secondary" className="mr-2">{product.categoryName}</Badge>
            <Badge>{product.productType}</Badge>
          </div>
          <h1 className="text-3xl font-display font-bold mb-4">{product.title}</h1>
          <p className="text-muted-foreground mb-6">{product.description}</p>

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({product.reviewsCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Download className="h-4 w-4" />
              <span>{product.salesCount} sold</span>
            </div>
          </div>

          <div className="aspect-video bg-gradient-to-br from-secondary/20 to-primary/10 rounded-xl relative mb-8">
            {product.thumbnail ? (
              <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ShoppingBag className="h-16 w-16 text-primary/30" />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-primary font-display mb-4">
                GHS {product.price.toFixed(2)}
              </div>
              <Button className="w-full mb-3 rounded-full" size="lg" onClick={handleAddToCart} disabled={addToCart.isPending}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {addToCart.isPending ? "Adding..." : "Add to Cart"}
              </Button>
              <div className="space-y-3 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Instant digital delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Lifetime access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Money-back guarantee</span>
                </div>
              </div>

              <Separator className="my-6" />

              <Link href={`/vendors/${product.vendorId}`}>
                <div className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {product.vendorName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">{product.vendorName}</p>
                    <p className="text-xs text-muted-foreground">Creator</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
