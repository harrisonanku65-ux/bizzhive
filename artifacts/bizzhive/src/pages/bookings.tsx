import { useListMyBookings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  CalendarClock,
  Clock,
  Video,
  CalendarX,
  ExternalLink,
} from "lucide-react";

/** Sessions the visitor has paid for, with the call link they bought. */
export default function Bookings() {
  const { data: bookings, isLoading } = useListMyBookings();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64" />
      </div>
    );
  }

  const now = Date.now();
  const upcoming = (bookings ?? []).filter(
    (b: any) =>
      new Date(b.startsAt).getTime() >= now && b.status !== "cancelled",
  );
  const past = (bookings ?? []).filter(
    (b: any) => new Date(b.startsAt).getTime() < now || b.status === "cancelled",
  );

  const renderBooking = (booking: any, isPast: boolean) => (
    <Card key={booking.id} className={isPast ? "opacity-75" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold">{booking.title}</h3>
              <Badge
                className={
                  booking.status === "cancelled"
                    ? "bg-red-100 text-red-800"
                    : booking.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                }
              >
                {booking.status === "booked" ? "Confirmed" : booking.status}
              </Badge>
            </div>
            <Link href={`/vendors/${booking.vendorId}`}>
              <p className="text-xs text-primary hover:underline">
                {booking.vendorName}
              </p>
            </Link>
          </div>
          <p className="font-bold text-primary font-display flex-shrink-0">
            GHS {booking.price.toFixed(2)}
          </p>
        </div>

        <div className="space-y-1.5 text-sm mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>
              {new Date(booking.startsAt).toLocaleString("en-GH", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{booking.durationMinutes} minutes</span>
          </div>
        </div>

        {booking.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {booking.description}
          </p>
        )}

        {booking.status === "cancelled" ? (
          <p className="text-sm text-muted-foreground border-t border-border/60 pt-3">
            This session was cancelled by the seller. If you haven't been
            refunded,{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact support
            </Link>
            .
          </p>
        ) : booking.meetingUrl ? (
          <div className="border-t border-border/60 pt-3">
            <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="rounded-full">
                <Video className="h-4 w-4 mr-2" /> Join session
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </Button>
            </a>
            {booking.meetingNotes && (
              <p className="text-xs text-muted-foreground mt-2">
                {booking.meetingNotes}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground border-t border-border/60 pt-3">
            The seller hasn't shared a call link yet. It'll appear here — check
            back before your session.
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-2">My Bookings</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Sessions you've booked. Confirm delivery on the{" "}
        <Link href="/orders" className="text-primary hover:underline">
          orders page
        </Link>{" "}
        once a session has happened to release payment to the seller.
      </p>

      {!bookings?.length ? (
        <div className="text-center py-16">
          <CalendarX className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Book a coaching or consultation session to see it here.
          </p>
          <Link href="/sessions">
            <Button>Browse Sessions</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((b: any) => renderBooking(b, false))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Past</h2>
              <div className="space-y-3">
                {past.map((b: any) => renderBooking(b, true))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
