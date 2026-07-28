import { useParams } from "wouter";
import { Link } from "wouter";
import {
  useGetProduct,
  useAddToCart,
  useListOrders,
  useListProductReviews,
  useCreateProductReview,
  getGetCartQueryKey,
  getListProductReviewsQueryKey,
  getGetProductQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  ShoppingBag,
  ShoppingCart,
  CheckCircle,
  Download,
  Music,
  FileText,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ReviewSection } from "@/components/ReviewSection";
import { useAuth } from "@/contexts/AuthContext";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id || "0");
  const { data: product, isLoading } = useGetProduct(productId);
  const { data: orders } = useListOrders();
  const { data: reviews } = useListProductReviews(productId);
  const addToCart = useAddToCart();
  const createReview = useCreateProductReview();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [reviewError, setReviewError] = useState<string | null>(null);

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
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  const hasPurchased = orders?.some(
    (order) =>
      order.status === "completed" &&
      order.items.some(
        (item) => item.itemType === "product" && item.itemId === product.id,
      ),
  );

  const handleAddToCart = () => {
    addToCart.mutate(
      { data: { itemType: "product", itemId: product.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        },
      },
    );
  };

  const handleReview = (review: {
    rating: number;
    comment: string;
    userName: string;
  }) => {
    setReviewError(null);
    createReview.mutate(
      { id: product.id, data: review },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListProductReviewsQueryKey(product.id),
          });
          // Rating and review count live on the product record.
          queryClient.invalidateQueries({
            queryKey: getGetProductQueryKey(product.id),
          });
        },
        onError: (err: any) =>
          setReviewError(
            err?.status === 409
              ? "You've already reviewed this product."
              : "We couldn't post that review. Please try again.",
          ),
      },
    );
  };

  // Audio listings get a preview player and their licensing terms surfaced —
  // buying a beat without hearing it first makes no sense.
  const isAudio = product.productType === "audio" || !!product.previewUrl;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-2">
            <Badge variant="secondary" className="mr-2">
              {product.categoryName}
            </Badge>
            <Badge>{product.productType}</Badge>
          </div>
          <h1 className="text-3xl font-display font-bold mb-4">
            {product.title}
          </h1>
          <p className="text-muted-foreground mb-6">{product.description}</p>

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({product.reviewsCount} reviews)
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Download className="h-4 w-4" />
              <span>{product.salesCount} sold</span>
            </div>
          </div>

          <div className="aspect-video bg-gradient-to-br from-secondary/20 to-primary/10 rounded-xl relative mb-8">
            {product.thumbnail ? (
              <img
                src={product.thumbnail}
                alt={product.title}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                {isAudio ? (
                  <Music className="h-16 w-16 text-primary/30" />
                ) : (
                  <ShoppingBag className="h-16 w-16 text-primary/30" />
                )}
              </div>
            )}
          </div>

          {product.previewUrl && (
            <Card className="mb-8">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Music className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm">Preview</h2>
                  <Badge variant="secondary" className="text-xs">
                    Sample
                  </Badge>
                </div>
                {/* Preview only — the full file is delivered after purchase. */}
                <audio
                  controls
                  preload="none"
                  src={product.previewUrl}
                  className="w-full"
                >
                  Your browser doesn't support audio playback.
                </audio>
              </CardContent>
            </Card>
          )}

          {product.licenseTerms && (
            <Card className="mb-8">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm">Licensing terms</h2>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {product.licenseTerms}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  By purchasing, you agree to these terms.
                </p>
              </CardContent>
            </Card>
          )}

          <Separator className="my-8" />

          <ReviewSection
            reviews={reviews}
            onSubmit={handleReview}
            isSubmitting={createReview.isPending}
            error={reviewError}
            defaultUserName={
              user?.displayName ??
              [user?.firstName, user?.lastName].filter(Boolean).join(" ")
            }
            emptyMessage="No reviews yet. If you've bought this, let others know what you thought."
          />
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-primary font-display mb-4">
                GHS {product.price.toFixed(2)}
              </div>

              {hasPurchased ? (
                <>
                  <p className="text-sm text-primary font-medium mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> You own this product
                  </p>
                  {product.fileUrl ? (
                    <a
                      href={product.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="w-full mb-3 rounded-full" size="lg">
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">
                      No file has been uploaded for this product yet.
                    </p>
                  )}
                </>
              ) : (
                <Button
                  className="w-full mb-3 rounded-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {addToCart.isPending ? "Adding..." : "Add to Cart"}
                </Button>
              )}

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
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {product.vendorName}
                    </p>
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
