import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, MessageSquare, AlertCircle } from "lucide-react";

export interface ReviewSubmission {
  rating: number;
  comment: string;
  userName: string;
}

interface ReviewSectionProps {
  reviews: any[] | undefined;
  onSubmit: (review: ReviewSubmission) => void;
  isSubmitting?: boolean;
  error?: string | null;
  /** Prefills the name field for signed-in users. */
  defaultUserName?: string;
  heading?: string;
  emptyMessage?: string;
}

/** Star row, used for both display and input. */
function Stars({
  value,
  onChange,
  size = "h-4 w-4",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Star
            className={`${size} ${filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
          />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

/**
 * Presentational review list + submission form. The parent owns the data
 * fetching so the same component can serve courses, products and vendors.
 */
export function ReviewSection({
  reviews,
  onSubmit,
  isSubmitting,
  error,
  defaultUserName = "",
  heading = "Reviews",
  emptyMessage = "No reviews yet. Be the first to leave one.",
}: ReviewSectionProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [userName, setUserName] = useState(defaultUserName);
  const [showForm, setShowForm] = useState(false);

  const count = reviews?.length ?? 0;
  const average =
    count > 0
      ? Math.round(((reviews ?? []).reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || !userName.trim()) return;
    onSubmit({ rating, comment: comment.trim(), userName: userName.trim() });
    setRating(0);
    setComment("");
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-display font-bold">{heading}</h2>
          {count > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Stars value={Math.round(average)} />
              <span className="text-sm text-muted-foreground">
                {average.toFixed(1)} out of 5 · {count} review
                {count === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full flex-shrink-0"
            onClick={() => setShowForm(true)}
          >
            Write a review
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-sm font-medium block mb-1">
                  Your rating
                </label>
                <Stars value={rating} onChange={setRating} size="h-6 w-6" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Your name
                </label>
                <input
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Your review{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What was good, what could be better?"
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[90px]"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || rating < 1}>
                  {isSubmitting ? "Posting..." : "Post review"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {count === 0 ? (
        <p className="text-sm text-muted-foreground py-6">{emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          {(reviews ?? []).map((review) => (
            <div
              key={review.id}
              className="border border-border/60 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-sm">{review.userName}</p>
                  <Stars value={review.rating} />
                </div>
                <p className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(review.createdAt).toLocaleDateString("en-GH", {
                    dateStyle: "medium",
                  })}
                </p>
              </div>

              {review.comment && <p className="text-sm">{review.comment}</p>}

              {review.vendorResponse && (
                <>
                  <Separator className="my-3" />
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-medium">Seller response</p>
                        <Badge variant="secondary" className="text-xs">
                          {review.vendorRespondedAt
                            ? new Date(
                                review.vendorRespondedAt,
                              ).toLocaleDateString("en-GH", {
                                dateStyle: "medium",
                              })
                            : ""}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {review.vendorResponse}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
