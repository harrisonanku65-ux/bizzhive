import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetAdminMe,
  useGetAdminOverview,
  useListDisputes,
  useResolveDispute,
  useListSupportTickets,
  useCloseSupportTicket,
  useAdminLogout,
  getListDisputesQueryKey,
  getGetAdminOverviewQueryKey,
  getListSupportTicketsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  LifeBuoy,
  Wallet,
  LogOut,
  CheckCircle,
  Undo2,
  Scissors,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type Resolution = "released" | "refunded_full" | "refunded_partial";

const RESOLUTION_COPY: Record<
  Resolution,
  { label: string; description: string; icon: typeof CheckCircle }
> = {
  released: {
    label: "Release to seller",
    description:
      "The seller delivered. Pay them their full share and close the dispute.",
    icon: CheckCircle,
  },
  refunded_full: {
    label: "Refund the buyer in full",
    description:
      "Nothing was delivered. Refund the whole amount; the seller is paid nothing.",
    icon: Undo2,
  },
  refunded_partial: {
    label: "Split — partial refund",
    description:
      "Partially delivered. Refund part of the amount; the seller is paid on the remainder.",
    icon: Scissors,
  },
};

export default function Admin() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: admin, isLoading: adminLoading, isError } = useGetAdminMe();
  const { data: overview } = useGetAdminOverview({
    query: { enabled: !!admin, queryKey: getGetAdminOverviewQueryKey() },
  });
  const [disputeFilter, setDisputeFilter] = useState<"open" | "resolved">("open");
  const { data: disputes, isLoading: disputesLoading } = useListDisputes(
    { status: disputeFilter },
    { query: { enabled: !!admin, queryKey: getListDisputesQueryKey({ status: disputeFilter }) } },
  );
  const { data: tickets } = useListSupportTickets(
    { status: "open" },
    { query: { enabled: !!admin, queryKey: getListSupportTicketsQueryKey({ status: "open" }) } },
  );

  const resolveDispute = useResolveDispute();
  const closeTicket = useCloseSupportTicket();
  const logout = useAdminLogout();

  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [resolution, setResolution] = useState<Resolution>("released");
  const [partialAmount, setPartialAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: getListDisputesQueryKey({ status: disputeFilter }) });
    queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListSupportTicketsQueryKey({ status: "open" }) });
  };

  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Not signed in as an admin — send them to the staff login rather than
  // revealing anything about the console.
  if (isError || !admin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShieldCheck className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">
          Admin sign-in required
        </h1>
        <p className="text-muted-foreground mb-6">
          This area is for BizzHive staff.
        </p>
        <Link href="/admin/login">
          <Button>Go to admin login</Button>
        </Link>
      </div>
    );
  }

  const openResolveDialog = (order: any) => {
    setActiveOrder(order);
    setResolution("released");
    setPartialAmount("");
    setNotes("");
    setFormError(null);
  };

  const handleResolve = () => {
    if (!activeOrder) return;
    setFormError(null);

    if (resolution === "refunded_partial") {
      const amount = Number(partialAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setFormError("Enter a refund amount greater than zero.");
        return;
      }
      if (amount >= activeOrder.refundableAmount) {
        setFormError(
          `A partial refund must be less than GHS ${activeOrder.refundableAmount.toFixed(2)}. Use a full refund instead.`,
        );
        return;
      }
    }

    resolveDispute.mutate(
      {
        id: activeOrder.id,
        data: {
          resolution,
          ...(resolution === "refunded_partial"
            ? { amount: Number(partialAmount) }
            : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setActiveOrder(null);
          refreshAll();
        },
        onError: () =>
          setFormError(
            "That didn't go through. The refund may have been rejected by the payment provider — check and try again.",
          ),
      },
    );
  };

  const stats = [
    {
      label: "Open disputes",
      value: overview?.openDisputes ?? 0,
      icon: AlertTriangle,
      tone: "bg-red-100 text-red-600",
    },
    {
      label: "Awaiting confirmation",
      value: overview?.awaitingConfirmation ?? 0,
      icon: Clock,
      tone: "bg-amber-100 text-amber-600",
    },
    {
      label: "Open tickets",
      value: overview?.openTickets ?? 0,
      icon: LifeBuoy,
      tone: "bg-blue-100 text-blue-600",
    },
    {
      label: "Held in escrow",
      value: `GHS ${(overview?.fundsHeldInEscrow ?? 0).toFixed(0)}`,
      icon: Wallet,
      tone: "bg-green-100 text-green-600",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Admin Console</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as {admin.name} ({admin.email})
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full flex-shrink-0"
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => navigate("/admin/login"),
            })
          }
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="disputes">
        <TabsList className="mb-6">
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="support">
            Support
            {(overview?.priorityTickets ?? 0) > 0 && (
              <Badge className="ml-2 bg-primary/10 text-primary border-primary/20">
                {overview?.priorityTickets} priority
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disputes">
          <div className="flex items-center gap-2 mb-4">
            <Button
              size="sm"
              variant={disputeFilter === "open" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setDisputeFilter("open")}
            >
              Open
            </Button>
            <Button
              size="sm"
              variant={disputeFilter === "resolved" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setDisputeFilter("resolved")}
            >
              Resolved
            </Button>
          </div>

          {disputesLoading ? (
            <Skeleton className="h-40" />
          ) : !disputes?.length ? (
            <div className="text-center py-16">
              <CheckCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {disputeFilter === "open"
                  ? "No open disputes. Everything is clear."
                  : "Nothing resolved yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((order: any) => (
                <Card key={order.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">Order #{order.id}</h3>
                          <Badge
                            className={
                              order.deliveryStatus === "disputed"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {order.deliveryStatus === "disputed"
                              ? "Disputed"
                              : order.resolution === "released"
                                ? "Released"
                                : order.resolution === "refunded_full"
                                  ? "Fully refunded"
                                  : "Partially refunded"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {order.buyerName ?? order.buyerEmail ?? "Guest buyer"}
                          {order.buyerEmail && order.buyerName
                            ? ` · ${order.buyerEmail}`
                            : ""}
                          {order.vendorNames?.length
                            ? ` → ${order.vendorNames.join(", ")}`
                            : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Raised{" "}
                          {order.disputeRaisedAt
                            ? new Date(order.disputeRaisedAt).toLocaleString(
                                "en-GH",
                                { dateStyle: "medium", timeStyle: "short" },
                              )
                            : "—"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-primary font-display">
                          GHS {order.total.toFixed(2)}
                        </p>
                        {order.refundedAmount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            GHS {order.refundedAmount.toFixed(2)} refunded
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          via {order.paymentProvider ?? "unknown"}
                        </p>
                      </div>
                    </div>

                    {order.disputeReason && (
                      <div className="rounded-lg bg-muted p-3 text-sm mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Buyer's reason
                        </p>
                        {order.disputeReason}
                      </div>
                    )}

                    <div className="space-y-1 mb-4">
                      {order.items.map((item: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <span className="min-w-0">{item.title}</span>
                          {item.vendorName && (
                            <span className="text-xs">· {item.vendorName}</span>
                          )}
                          <span className="ml-auto flex-shrink-0">
                            GHS {item.price?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.deliveryStatus === "disputed" ? (
                      <Button
                        className="rounded-full"
                        onClick={() => openResolveDialog(order)}
                      >
                        Resolve dispute
                      </Button>
                    ) : (
                      <div className="border-t border-border/60 pt-3 text-sm">
                        <p className="text-xs text-muted-foreground mb-1">
                          Resolved{" "}
                          {order.resolvedAt
                            ? new Date(order.resolvedAt).toLocaleString(
                                "en-GH",
                                { dateStyle: "medium", timeStyle: "short" },
                              )
                            : ""}
                        </p>
                        {order.resolutionNotes && <p>{order.resolutionNotes}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="support">
          {!tickets?.length ? (
            <div className="text-center py-16">
              <LifeBuoy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No open support tickets.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket: any) => (
                <Card key={ticket.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-sm">
                            {ticket.subject}
                          </h3>
                          {ticket.priority === "priority" && (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              Premium — priority
                            </Badge>
                          )}
                          {ticket.priority === "standard" && (
                            <Badge variant="secondary">Pro</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ticket.name} · {ticket.email} · {ticket.requesterRole}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(ticket.createdAt).toLocaleDateString("en-GH", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <p className="text-sm mb-3 whitespace-pre-wrap">
                      {ticket.message}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={closeTicket.isPending}
                      onClick={() =>
                        closeTicket.mutate(
                          { id: ticket.id, data: {} },
                          { onSuccess: refreshAll },
                        )
                      }
                    >
                      Mark handled
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={activeOrder !== null}
        onOpenChange={(open) => {
          if (!open) setActiveOrder(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve order #{activeOrder?.id}</DialogTitle>
          </DialogHeader>

          {activeOrder && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                GHS {activeOrder.refundableAmount.toFixed(2)} is still
                refundable on this order.
              </p>

              <div className="space-y-2">
                {(Object.keys(RESOLUTION_COPY) as Resolution[]).map((key) => {
                  const copy = RESOLUTION_COPY[key];
                  const Icon = copy.icon;
                  const selected = resolution === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setResolution(key)}
                      className={`w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{copy.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {copy.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {resolution === "refunded_partial" && (
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Refund amount (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={activeOrder.refundableAmount}
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The seller will be paid on the remaining GHS{" "}
                    {Math.max(
                      0,
                      activeOrder.refundableAmount - (Number(partialAmount) || 0),
                    ).toFixed(2)}
                    .
                  </p>
                </div>
              )}

              <Separator />

              <div>
                <label className="text-sm font-medium block mb-1">
                  Resolution notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you find, and why did you decide this? Saved on the order for the record."
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[80px]"
                />
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setActiveOrder(null)}
                  disabled={resolveDispute.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResolve}
                  disabled={resolveDispute.isPending}
                >
                  {resolveDispute.isPending
                    ? "Processing..."
                    : "Confirm resolution"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
