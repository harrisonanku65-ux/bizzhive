import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Package } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Orders() {
  const { data: orders, isLoading } = useListOrders();

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-8">My Orders</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Start shopping to see your order history</p>
          <Link href="/courses"><Button>Browse Courses</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Order #{order.id}</h3>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-GH", { dateStyle: "long" })}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={order.status === "completed" ? "bg-green-100 text-green-800" : order.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
                      {order.status}
                    </Badge>
                    <p className="text-lg font-bold text-primary font-display mt-1">GHS {order.total.toFixed(2)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span>{item.title}</span>
                      <span className="text-muted-foreground ml-auto">GHS {item.price?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
