import { useGetCart, useRemoveFromCart, getGetCartQueryKey, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Trash2, BookOpen, ShoppingBag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { CheckoutModal } from "@/components/CheckoutModal";

export default function Cart() {
  const { data: cart, isLoading } = useGetCart();
  const removeFromCart = useRemoveFromCart();
  const queryClient = useQueryClient();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleRemove = (id: number) => {
    removeFromCart.mutate({ id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }); }
    });
  };

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-8">Shopping Cart</h1>

      {!cart || cart.items.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
          <p className="text-muted-foreground text-sm mb-6">Start adding courses and products to your cart</p>
          <div className="flex gap-3 justify-center">
            <Link href="/courses"><Button>Browse Courses</Button></Link>
            <Link href="/products"><Button variant="outline">Browse Products</Button></Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-20 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      {item.itemType === "course" ? (
                        <BookOpen className="h-8 w-8 text-primary/40" />
                      ) : (
                        <ShoppingBag className="h-8 w-8 text-primary/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.vendorName} &middot; {item.itemType === "course" ? "Course" : "Digital Product"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary font-display">GHS {item.price.toFixed(2)}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive mt-1"
                        onClick={() => handleRemove(item.id)}
                        disabled={removeFromCart.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h3 className="font-display font-bold text-lg mb-4">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items ({cart.itemCount})</span>
                      <span>GHS {cart.total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between font-bold text-lg mb-2">
                    <span>Total</span>
                    <span className="text-primary font-display">GHS {cart.total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">Pay via card or mobile money (MTN, Vodafone, AirtelTigo)</p>
                  <Button className="w-full rounded-full" size="lg" onClick={() => setCheckoutOpen(true)}>
                    Proceed to Payment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <CheckoutModal
            open={checkoutOpen}
            onOpenChange={setCheckoutOpen}
            total={cart.total}
            onSuccess={handlePaymentSuccess}
          />
        </>
      )}
    </div>
  );
}
