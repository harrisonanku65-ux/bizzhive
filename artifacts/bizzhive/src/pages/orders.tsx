import {
  useListOrders,
  useConfirmDelivery,
  useReportOrderIssue,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBag,
  Package,
  LogIn,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/** Human-readable escrow state, so buyers understand where their money is. */
function escrowLabel(order: any) {
  switch (order.deliveryStatus) {
    case "awaiting_confirmation":
      return {
        text: "Payment held in escrow",
        tone: "bg-amber-100 text-amber-800",
        icon: ShieldCheck,
      };
    case "confirmed":
      return {
        text: "Delivery confirmed — seller paid",
        tone: "bg-green-100 text-green-800",
        icon: CheckCircle,
      };
    case "auto_released":
      return {
        text: "Auto-released after deadline",
        tone: "bg-green-100 text-green-800",
        icon: Clock,
      };
    case "disputed":
      return {
        text: "Under review by BizzHive",
        tone: "bg-red-100 text-red-800",
        icon: AlertTriangle,
      };
    case "resolved":
      return {
        text:
          order.resolution === "released"
            ? "Resolved — released to seller"
            : order.resolution === "refunded_full"
              ? "Resolved — fully refunded"
              : "Resolved — partially refunded",
        tone: "bg-blue-100 text-blue-800",
        icon: CheckCircle,
      };
    default:
      return null;
  }
}

export default function Orders() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading } = useListOrders();
  const queryClient = useQueryClient();

  const confirmDelivery = useConfirmDelivery();
  const reportIssue = useReportOrderIssue();

  const [disputeOrderId, setDisputeOrderId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });

  const handleConfirm = (orderId: number) => {
    setActionError(null);
    confirmDelivery.mutate(
      { id: orderId },
      {
        onSuccess: refresh,
        onError: () =>
          setActionError(
            "We couldn't confirm that order. Please refresh and try again.",
          ),
      },
    );
  };

  const handleReport = () => {
    if (!disputeOrderId || disputeReason.trim().length < 10) return;
    setActionError(null);
    reportIssue.mutate(
      { id: disputeOrderId, data: { reason: disputeReason.trim() } },
      {
        onSuccess: () => {
          setDisputeOrderId(null);
          setDisputeReason("");
          refresh();
        },
        onError: () =>
          setActionError("We couldn't submit that report. Please try again."),
      },
    );
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <LogIn className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">
          Sign In Required
        </h1>
        <p className="text-muted-foreground mb-6">
          Please sign in to view your orders.
        </p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-2">My Orders</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Your payment is held securely until you confirm you received what you
        paid for.
      </p>

      {actionError && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {!orders || orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Start shopping to see your order history
          </p>
          <Link href="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const escrow = escrowLabel(order);
            const EscrowIcon = escrow?.icon;
            const canAct =
              order.deliveryStatus === "awaiting_confirmation" &&
              order.paymentStatus === "paid";

            return (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Order #{order.id}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-GH", {
                          dateStyle: "long",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={
                          order.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : order.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {order.status}
                      </Badge>
                      <p className="text-lg font-bold text-primary font-display mt-1">
                        GHS {order.total.toFixed(2)}
                      </p>
                      {order.refundedAmount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          GHS {order.refundedAmount.toFixed(2)} refunded
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        {item.itemType === "session" ? (
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ShoppingBag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="min-w-0">
                          {item.title}
                          {item.itemType === "session" && item.startsAt && (
                            <span className="text-muted-foreground">
                              {" "}
                              &middot;{" "}
                              {new Date(item.startsAt).toLocaleString("en-GH", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground ml-auto flex-shrink-0">
                          GHS {item.price?.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {escrow && (
                    <div className="flex flex-col md:flex-row md:items-center gap-3 border-t border-border/60 pt-4">
                      <div className="flex items-center gap-2 flex-1">
                        {EscrowIcon && (
                          <EscrowIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div>
                          <Badge className={escrow.tone}>{escrow.text}</Badge>
                          {canAct && order.deliveryDeadline && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Releases automatically on{" "}
                              {new Date(
                                order.deliveryDeadline,
                              ).toLocaleDateString("en-GH", {
                                dateStyle: "medium",
                              })}{" "}
                              if you don't respond.
                            </p>
                          )}
                          {order.deliveryStatus === "disputed" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Our team is reviewing this. We'll be in touch by
                              email.
                            </p>
                          )}
                        </div>
                      </div>

                      {canAct && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            disabled={reportIssue.isPending}
                            onClick={() => {
                              setDisputeOrderId(order.id);
                              setDisputeReason("");
                            }}
                          >
                            Report a problem
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-full"
                            disabled={confirmDelivery.isPending}
                            onClick={() => handleConfirm(order.id)}
                          >
                            {confirmDelivery.isPending
                              ? "Confirming..."
                              : "Confirm delivery"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={disputeOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setDisputeOrderId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your payment stays on hold while our team reviews this. Tell us
              what went wrong — the more detail, the faster we can sort it out.
            </p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. The download link doesn't work and the seller hasn't replied in 3 days."
              className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[120px]"
            />
            {disputeReason.trim().length > 0 &&
              disputeReason.trim().length < 10 && (
                <p className="text-xs text-muted-foreground">
                  Please add a little more detail.
                </p>
              )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDisputeOrderId(null)}
                disabled={reportIssue.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReport}
                disabled={
                  reportIssue.isPending || disputeReason.trim().length < 10
                }
              >
                {reportIssue.isPending ? "Submitting..." : "Submit report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
