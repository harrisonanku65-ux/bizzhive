import { useState } from "react";
import { Link } from "wouter";
import {
  useListSessionSlots,
  useListCategories,
  useAddToCart,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  Clock,
  ShieldCheck,
  AlertCircle,
  Video,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Browse and book one-on-one sessions — the buyer-facing surface for the
 * Coaching & Mentorship, Consultation Calls and Gaming Coaching categories.
 */
export default function Sessions() {
  // Honour ?categoryId= so links from the Gaming Hub land pre-filtered.
  const [categoryId, setCategoryId] = useState<string>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("categoryId");
    return fromUrl ?? "all";
  });
  const queryClient = useQueryClient();

  const { data: categories } = useListCategories();
  const { data: slots, isLoading } = useListSessionSlots(
    categoryId !== "all" ? { categoryId: parseInt(categoryId) } : undefined,
  );

  const addToCart = useAddToCart();
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBook = (slotId: number) => {
    setError(null);
    setBookingId(slotId);
    addToCart.mutate(
      { data: { itemType: "session", itemId: slotId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setBookingId(null);
        },
        onError: () => {
          // The most likely cause is a 409 — someone else grabbed the slot.
          setError(
            "That slot was just taken. Pick another time — the list has been refreshed.",
          );
          setBookingId(null);
          queryClient.invalidateQueries();
        },
      },
    );
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary/10 via-background to-primary/10 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Book a session
          </Badge>
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4 flex items-center gap-3">
            <CalendarClock className="h-9 w-9 text-primary" /> Coaching &amp;
            Consultations
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Book a one-on-one slot with Ghanaian coaches, consultants and gaming
            pros. Pay securely — your money is held until the session happens.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <p className="text-sm text-muted-foreground">
              {slots?.length ?? 0} upcoming slot
              {slots?.length === 1 ? "" : "s"} available
            </p>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full md:w-60">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : !slots?.length ? (
            <div className="text-center py-16">
              <CalendarClock className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No sessions available right now
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                Check back soon, or browse creators to see what else they offer.
              </p>
              <Link href="/vendors">
                <Button variant="outline">Browse Creators</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {slots.map((slot: any) => (
                <Card
                  key={slot.id}
                  className="hover:border-primary/40 transition-all hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <Badge variant="secondary" className="mb-3">
                      {slot.categoryName}
                    </Badge>
                    <h3 className="font-semibold mb-1">{slot.title}</h3>
                    <Link href={`/vendors/${slot.vendorId}`}>
                      <p className="text-xs text-primary mb-3 hover:underline">
                        {slot.vendorName}
                      </p>
                    </Link>

                    {slot.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {slot.description}
                      </p>
                    )}

                    <div className="space-y-1.5 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>
                          {new Date(slot.startsAt).toLocaleString("en-GH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{slot.durationMinutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Video className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs">
                          Call link shared after payment
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-4">
                      <p className="font-bold text-primary font-display">
                        GHS {slot.price.toFixed(2)}
                      </p>
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={addToCart.isPending && bookingId === slot.id}
                        onClick={() => handleBook(slot.id)}
                      >
                        {addToCart.isPending && bookingId === slot.id
                          ? "Reserving..."
                          : "Reserve slot"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-10 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Reserved for 20 minutes</p>
              <p className="text-muted-foreground">
                Adding a slot to your cart holds it while you check out, so
                nobody else can book the same time. Complete payment to confirm.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
