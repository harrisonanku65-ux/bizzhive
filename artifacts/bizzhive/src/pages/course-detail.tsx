import { useParams } from "wouter";
import { Link } from "wouter";
import { useGetCourse, useListCourseReviews, useAddToCart, useCreateCourseReview, getGetCartQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Star, BookOpen, Clock, Users, Play, Lock, ShoppingCart, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0");
  const { data: course, isLoading } = useGetCourse(courseId);
  const { data: reviews } = useListCourseReviews(courseId);
  const addToCart = useAddToCart();
  const createReview = useCreateCourseReview();
  const queryClient = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-64 mb-4" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Course not found</h2>
        <Link href="/courses"><Button>Browse Courses</Button></Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart.mutate({ data: { itemType: "course", itemId: course.id } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }); }
    });
  };

  const handleSubmitReview = () => {
    if (!reviewName) return;
    createReview.mutate({ id: courseId, data: { rating: reviewRating, comment: reviewComment, userName: reviewName } }, {
      onSuccess: () => {
        setShowReviewForm(false);
        setReviewComment("");
        setReviewName("");
        queryClient.invalidateQueries();
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-2">
            <Badge variant="secondary" className="mr-2">{course.categoryName}</Badge>
            <Badge>{course.level}</Badge>
          </div>
          <h1 className="text-3xl font-display font-bold mb-4">{course.title}</h1>
          <p className="text-muted-foreground mb-6">{course.description}</p>

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{course.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({course.reviewsCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{course.enrollments} enrolled</span>
            </div>
            {course.duration && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{course.duration}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{course.lessonsCount} lessons</span>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="mb-8">
            <h2 className="text-xl font-display font-bold mb-4">Course Curriculum</h2>
            <div className="space-y-2">
              {course.lessons?.map((lesson, i) => (
                <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{lesson.title}</h4>
                    {lesson.description && <p className="text-xs text-muted-foreground mt-0.5">{lesson.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lesson.duration && <span className="text-xs text-muted-foreground">{lesson.duration}</span>}
                    {lesson.isFree ? (
                      <Badge variant="secondary" className="text-xs">
                        <Play className="h-3 w-3 mr-1" /> Free
                      </Badge>
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold">Reviews</h2>
              <Button variant="outline" size="sm" onClick={() => setShowReviewForm(!showReviewForm)}>
                Write a Review
              </Button>
            </div>

            {showReviewForm && (
              <Card className="mb-6">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Your Name</label>
                    <input
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Rating</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(r => (
                        <button key={r} onClick={() => setReviewRating(r)}>
                          <Star className={`h-5 w-5 ${r <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Comment</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[80px]"
                      placeholder="Share your experience..."
                    />
                  </div>
                  <Button onClick={handleSubmitReview} disabled={!reviewName || createReview.isPending}>
                    Submit Review
                  </Button>
                </CardContent>
              </Card>
            )}

            {reviews && reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 border border-border/60 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{review.userName}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(r => (
                          <Star key={r} className={`h-3.5 w-3.5 ${r <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-t-lg relative">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover rounded-t-lg" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <BookOpen className="h-12 w-12 text-primary/40" />
                </div>
              )}
            </div>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-primary font-display mb-4">
                GHS {course.price.toFixed(2)}
              </div>
              <Button className="w-full mb-3 rounded-full" size="lg" onClick={handleAddToCart} disabled={addToCart.isPending}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {addToCart.isPending ? "Adding..." : "Add to Cart"}
              </Button>
              <div className="space-y-3 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Full lifetime access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>{course.lessonsCount} lessons included</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Certificate of completion</span>
                </div>
              </div>

              <Separator className="my-6" />

              <Link href={`/vendors/${course.vendorId}`}>
                <div className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {course.vendorName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">{course.vendorName}</p>
                    <p className="text-xs text-muted-foreground">Course Instructor</p>
                  </div>
                </div>
              </Link>
              {course.vendorBio && (
                <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{course.vendorBio}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
