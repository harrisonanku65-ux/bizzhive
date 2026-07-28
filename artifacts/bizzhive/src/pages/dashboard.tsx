import { useState } from "react";
import {
  useGetDashboardStats,
  useGetRecentActivity,
  useGetCategoryBreakdown,
  useListCourses,
  useListProducts,
  useCreateCourse,
  useCreateProduct,
  useDeleteCourse,
  useDeleteProduct,
  useCreateLesson,
  getListCoursesQueryKey,
  getListProductsQueryKey,
  useListCategories,
  useUpdateVendorPayoutSettings,
  useGetVendor,
  getGetVendorQueryKey,
  useSubscribeVendor,
  useGetCourse,
  getGetCourseQueryKey,
  useGetVendorAnalytics,
  getGetVendorAnalyticsQueryKey,
  useListVendorSessionSlots,
  useCreateSessionSlot,
  useDeleteSessionSlot,
  useCancelSessionSlot,
  useCompleteSessionSlot,
  useUpdateSessionSlot,
  getListVendorSessionSlotsQueryKey,
  useListAllVendorReviews,
  useRespondToReview,
  getListAllVendorReviewsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  CheckCircle,
  Smartphone,
  LogIn,
  Lock,
  CalendarClock,
  Clock,
  Star,
  MessageSquare,
  Trash2,
  Music,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { uploadFile } from "@/lib/uploads";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const vendorId = user?.vendorId ?? null;

  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: activity } = useGetRecentActivity();
  const { data: breakdown } = useGetCategoryBreakdown();
  const { data: allCourses } = useListCourses(
    vendorId ? { vendorId } : undefined,
  );
  const { data: allProducts } = useListProducts(
    vendorId ? { vendorId } : undefined,
  );
  const { data: categories } = useListCategories();
  const { data: vendor } = useGetVendor(vendorId ?? 0, {
    query: {
      enabled: !!vendorId,
      queryKey: getGetVendorQueryKey(vendorId ?? 0),
    },
  });

  const { data: analytics } = useGetVendorAnalytics(vendorId ?? 0, {
    query: { enabled: !!vendorId, queryKey: getGetVendorAnalyticsQueryKey(vendorId ?? 0) },
  });
  const { data: slots } = useListVendorSessionSlots(vendorId ?? 0, {
    query: { enabled: !!vendorId, queryKey: getListVendorSessionSlotsQueryKey(vendorId ?? 0) },
  });
  const { data: allReviews } = useListAllVendorReviews(vendorId ?? 0, {
    query: { enabled: !!vendorId, queryKey: getListAllVendorReviewsQueryKey(vendorId ?? 0) },
  });

  const createSlot = useCreateSessionSlot();
  const updateSlot = useUpdateSessionSlot();
  const deleteSlot = useDeleteSessionSlot();
  const cancelSlot = useCancelSessionSlot();
  const completeSlot = useCompleteSessionSlot();
  const respondToReview = useRespondToReview();

  const subscribeVendor = useSubscribeVendor();
  const createCourse = useCreateCourse();
  const createProduct = useCreateProduct();
  const deleteCourse = useDeleteCourse();
  const deleteProduct = useDeleteProduct();
  const createLesson = useCreateLesson();
  const updatePayoutSettings = useUpdateVendorPayoutSettings();
  const queryClient = useQueryClient();

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: "",
    level: "beginner",
    categoryId: "",
    duration: "",
  });

  const [courseThumbnailFile, setCourseThumbnailFile] = useState<File | null>(
    null,
  );
  const [uploadingCourseThumbnail, setUploadingCourseThumbnail] =
    useState(false);
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    price: "",
    productType: "ebook",
    categoryId: "",
    licenseTerms: "",
  });
  const [productPreviewFile, setProductPreviewFile] = useState<File | null>(null);

  const [slotForm, setSlotForm] = useState({
    title: "",
    description: "",
    startsAt: "",
    durationMinutes: "60",
    price: "",
    categoryId: "",
    meetingUrl: "",
    meetingNotes: "",
  });
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const [respondingReviewId, setRespondingReviewId] = useState<number | null>(
    null,
  );
  const [responseText, setResponseText] = useState("");
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    momoNumber: "",
    momoNetwork: "MTN" as "MTN" | "Vodafone" | "AirtelTigo",
    email: "",
  });
  const [payoutSaved, setPayoutSaved] = useState(false);

  const [upgradingTier, setUpgradingTier] = useState<"pro" | "premium" | null>(
    null,
  );
  const [productThumbnailFile, setProductThumbnailFile] = useState<File | null>(
    null,
  );
  const [productContentFile, setProductContentFile] = useState<File | null>(
    null,
  );
  const [uploadingProduct, setUploadingProduct] = useState(false);

  const [manageLessonsCourseId, setManageLessonsCourseId] = useState<
    number | null
  >(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    duration: "",
    isFree: false,
    contentUrl: "",
  });

  const { data: courseDetail, refetch: refetchCourseDetail } = useGetCourse(
    manageLessonsCourseId ?? 0,
    {
      query: {
        enabled: !!manageLessonsCourseId,
        queryKey: getGetCourseQueryKey(manageLessonsCourseId ?? 0),
      },
    },
  );

  const handleUpgrade = (tier: "pro" | "premium") => {
    if (!vendorId || !user?.email) return;
    setUpgradingTier(tier);
    subscribeVendor.mutate(
      { id: vendorId, data: { email: user.email, tier } },
      {
        onSuccess: (res) => {
          window.location.href = res.paymentUrl;
        },
        onError: () => setUpgradingTier(null),
      },
    );
  };

  const handleCreateCourse = async () => {
    if (
      !courseForm.title ||
      !courseForm.price ||
      !courseForm.categoryId ||
      !vendorId
    )
      return;

    let thumbnailUrl: string | undefined;
    if (courseThumbnailFile) {
      setUploadingCourseThumbnail(true);
      try {
        thumbnailUrl = await uploadFile(courseThumbnailFile);
      } catch {
        setUploadingCourseThumbnail(false);
        return;
      }
      setUploadingCourseThumbnail(false);
    }

    createCourse.mutate(
      {
        data: {
          title: courseForm.title,
          description: courseForm.description,
          price: parseFloat(courseForm.price),
          level: courseForm.level as any,
          categoryId: parseInt(courseForm.categoryId),
          vendorId,
          duration: courseForm.duration,
          thumbnail: thumbnailUrl,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
          setCourseDialogOpen(false);
          setCourseForm({
            title: "",
            description: "",
            price: "",
            level: "beginner",
            categoryId: "",
            duration: "",
          });
          setCourseThumbnailFile(null);
        },
      },
    );
  };

  const handleAddLesson = () => {
    if (!manageLessonsCourseId || !lessonForm.title) return;
    createLesson.mutate(
      {
        courseId: manageLessonsCourseId,
        data: {
          title: lessonForm.title,
          duration: lessonForm.duration || undefined,
          isFree: lessonForm.isFree,
          sortOrder: courseDetail?.lessons?.length ?? 0,
          contentUrl: lessonForm.contentUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          refetchCourseDetail();
          queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
          setLessonForm({
            title: "",
            duration: "",
            isFree: false,
            contentUrl: "",
          });
        },
      },
    );
  };

  const handleCreateProduct = async () => {
    if (
      !productForm.title ||
      !productForm.price ||
      !productForm.categoryId ||
      !vendorId
    )
      return;

    setUploadingProduct(true);
    let thumbnailUrl: string | undefined;
    let fileUrl: string | undefined;
    let previewUrl: string | undefined;
    try {
      if (productThumbnailFile)
        thumbnailUrl = await uploadFile(productThumbnailFile);
      if (productContentFile) fileUrl = await uploadFile(productContentFile);
      if (productPreviewFile) previewUrl = await uploadFile(productPreviewFile);
    } catch {
      setUploadingProduct(false);
      return;
    }
    setUploadingProduct(false);

    createProduct.mutate(
      {
        data: {
          title: productForm.title,
          description: productForm.description,
          price: parseFloat(productForm.price),
          productType: productForm.productType as any,
          categoryId: parseInt(productForm.categoryId),
          vendorId,
          thumbnail: thumbnailUrl,
          fileUrl,
          previewUrl,
          licenseTerms: productForm.licenseTerms || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListProductsQueryKey(),
          });
          setProductDialogOpen(false);
          setProductForm({
            title: "",
            description: "",
            price: "",
            productType: "ebook",
            categoryId: "",
            licenseTerms: "",
          });
          setProductThumbnailFile(null);
          setProductContentFile(null);
          setProductPreviewFile(null);
        },
      },
    );
  };

  const handleCreateSlot = () => {
    setSlotError(null);
    if (
      !slotForm.title ||
      !slotForm.startsAt ||
      !slotForm.price ||
      !slotForm.categoryId ||
      !vendorId
    ) {
      setSlotError("Title, category, date/time and price are all required.");
      return;
    }

    const start = new Date(slotForm.startsAt);
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) {
      setSlotError("Pick a date and time in the future.");
      return;
    }

    createSlot.mutate(
      {
        data: {
          vendorId,
          categoryId: parseInt(slotForm.categoryId),
          title: slotForm.title,
          description: slotForm.description || undefined,
          // datetime-local gives local wall-clock time; toISOString converts
          // it to UTC so the stored instant is unambiguous.
          startsAt: start.toISOString(),
          durationMinutes: parseInt(slotForm.durationMinutes) || 60,
          price: parseFloat(slotForm.price),
          meetingUrl: slotForm.meetingUrl || undefined,
          meetingNotes: slotForm.meetingNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListVendorSessionSlotsQueryKey(vendorId),
          });
          setSlotDialogOpen(false);
          setSlotForm({
            title: "",
            description: "",
            startsAt: "",
            durationMinutes: "60",
            price: "",
            categoryId: "",
            meetingUrl: "",
            meetingNotes: "",
          });
        },
        onError: (err: any) =>
          setSlotError(
            err?.status === 403
              ? "You've hit your plan's active listing limit. Upgrade to publish more slots."
              : "We couldn't publish that slot. Please try again.",
          ),
      },
    );
  };

  const refreshSlots = () =>
    vendorId &&
    queryClient.invalidateQueries({
      queryKey: getListVendorSessionSlotsQueryKey(vendorId),
    });

  const handleRespond = (reviewId: number) => {
    if (!responseText.trim()) return;
    respondToReview.mutate(
      { id: reviewId, data: { response: responseText.trim() } },
      {
        onSuccess: () => {
          if (vendorId) {
            queryClient.invalidateQueries({
              queryKey: getListAllVendorReviewsQueryKey(vendorId),
            });
          }
          setRespondingReviewId(null);
          setResponseText("");
        },
      },
    );
  };

  const isAudioProduct = productForm.productType === "audio";

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
          Please sign in to access your seller dashboard.
        </p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  if (!vendorId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">
          Seller Account Required
        </h1>
        <p className="text-muted-foreground mb-6">
          You need a seller account to access the dashboard. Upgrade your
          account to start selling.
        </p>
        <Link href="/signup?role=seller">
          <Button>Become a Seller</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Vendor Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your courses and products
          </p>
        </div>
      </div>

      {vendor && vendor.plan !== "premium" && (
        <Card className="mb-8 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {vendor.plan === "free" ? "Free Plan" : "Pro Plan"}
                </Badge>
                {vendor.verifiedSeller && (
                  <Badge className="bg-accent/10 text-accent-foreground border-accent/20">
                    <CheckCircle className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {vendor.plan === "free"
                  ? "You're on the Free plan — up to 1 listing. Upgrade for more listings, analytics, and priority placement."
                  : "You're on the Pro plan. Go Premium for unlimited listings, the verified badge, and featured homepage placement."}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {vendor.plan === "free" && (
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={subscribeVendor.isPending}
                  onClick={() => handleUpgrade("pro")}
                >
                  {upgradingTier === "pro" && subscribeVendor.isPending
                    ? "Redirecting..."
                    : "Upgrade to Pro — GHS 80/mo"}
                </Button>
              )}
              <Button
                className="rounded-full"
                disabled={subscribeVendor.isPending}
                onClick={() => handleUpgrade("premium")}
              >
                {upgradingTier === "premium" && subscribeVendor.isPending
                  ? "Redirecting..."
                  : "Go Premium — GHS 200/mo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {stats?.totalCourses ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {stats?.totalProducts ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  GHS {(stats?.totalRevenue ?? 0).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {stats?.totalVendors ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="courses">
        <TabsList className="mb-6">
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="products">My Products</TabsTrigger>
          <TabsTrigger value="sessions">Availability</TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews
            {allReviews?.some((r: any) => !r.vendorResponse) && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {allReviews.filter((r: any) => !r.vendorResponse).length} new
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Courses</h2>
            <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> New Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Course Thumbnail
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setCourseThumbnailFile(e.target.files?.[0] ?? null)
                      }
                      className="w-full text-sm"
                    />
                  </div>
                  <input
                    placeholder="Course Title"
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, title: e.target.value })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder="Description"
                    value={courseForm.description}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[80px]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Price (GHS)"
                      type="number"
                      value={courseForm.price}
                      onChange={(e) =>
                        setCourseForm({ ...courseForm, price: e.target.value })
                      }
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Duration (e.g. 10 hours)"
                      value={courseForm.duration}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          duration: e.target.value,
                        })
                      }
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={courseForm.level}
                      onValueChange={(v) =>
                        setCourseForm({ ...courseForm, level: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={courseForm.categoryId}
                      onValueChange={(v) =>
                        setCourseForm({ ...courseForm, categoryId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCreateCourse}
                    disabled={
                      createCourse.isPending || uploadingCourseThumbnail
                    }
                    className="w-full"
                  >
                    {uploadingCourseThumbnail
                      ? "Uploading thumbnail..."
                      : createCourse.isPending
                        ? "Creating..."
                        : "Create Course"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {allCourses?.map((course) => (
              <Card key={course.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-12 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-6 w-6 text-primary/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{course.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {course.categoryName} &middot; {course.level} &middot;{" "}
                      {course.lessonsCount} lessons
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary font-display text-sm">
                      GHS {course.price.toFixed(2)}
                    </p>
                    <Badge
                      variant={course.published ? "default" : "secondary"}
                      className="text-xs mt-1"
                    >
                      {course.published ? "Published" : "Draft"}
                    </Badge>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary"
                        onClick={() => setManageLessonsCourseId(course.id)}
                      >
                        Manage Lessons
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-destructive"
                        disabled={deleteCourse.isPending}
                        onClick={() => {
                          if (!window.confirm(`Delete "${course.title}"? This can't be undone and will also remove its reviews.`)) return;
                          deleteCourse.mutate(
                            { id: course.id },
                            { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() }) },
                          );
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!allCourses?.length && (
              <p className="text-muted-foreground text-sm text-center py-8">
                No courses yet. Create your first course above.
              </p>
            )}
          </div>

          <Dialog
            open={manageLessonsCourseId !== null}
            onOpenChange={(v) => {
              if (!v) setManageLessonsCourseId(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Lessons</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {courseDetail?.lessons?.length ? (
                    courseDetail.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between border border-border/60 rounded-lg p-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {lesson.duration ?? "No duration set"}{" "}
                            {lesson.isFree ? "· Free preview" : ""}
                          </p>
                        </div>
                        {lesson.contentUrl ? (
                          <Badge variant="secondary" className="text-xs">
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            No link
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No lessons added yet.
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <input
                    placeholder="Lesson Title"
                    value={lessonForm.title}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, title: e.target.value })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Duration (e.g. 12 min)"
                    value={lessonForm.duration}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, duration: e.target.value })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Video link (YouTube, Vimeo, Google Drive...)"
                    value={lessonForm.contentUrl}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        contentUrl: e.target.value,
                      })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={lessonForm.isFree}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          isFree: e.target.checked,
                        })
                      }
                    />
                    Free preview lesson
                  </label>
                  <Button
                    onClick={handleAddLesson}
                    disabled={createLesson.isPending}
                    className="w-full"
                  >
                    {createLesson.isPending ? "Adding..." : "Add Lesson"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="products">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Products</h2>
            <Dialog
              open={productDialogOpen}
              onOpenChange={setProductDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> New Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <input
                    placeholder="Product Title"
                    value={productForm.title}
                    onChange={(e) =>
                      setProductForm({ ...productForm, title: e.target.value })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder="Description"
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[80px]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Price (GHS)"
                      type="number"
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          price: e.target.value,
                        })
                      }
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                    />
                    <Select
                      value={productForm.productType}
                      onValueChange={(v) =>
                        setProductForm({ ...productForm, productType: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ebook">Ebook</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="audio">Beat / Audio</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select
                    value={productForm.categoryId}
                    onValueChange={(v) =>
                      setProductForm({ ...productForm, categoryId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Product Thumbnail
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setProductThumbnailFile(e.target.files?.[0] ?? null)
                      }
                      className="w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Product File (what buyers download)
                    </label>
                    <input
                      type="file"
                      onChange={(e) =>
                        setProductContentFile(e.target.files?.[0] ?? null)
                      }
                      className="w-full text-sm"
                    />
                  </div>

                  {isAudioProduct && (
                    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">Audio listing</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">
                          Preview clip
                        </label>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) =>
                            setProductPreviewFile(e.target.files?.[0] ?? null)
                          }
                          className="w-full text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload a short, watermarked or tagged sample. Buyers
                          hear this before paying; the full file stays private.
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">
                          Licensing terms
                        </label>
                        <textarea
                          value={productForm.licenseTerms}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              licenseTerms: e.target.value,
                            })
                          }
                          placeholder="e.g. Non-exclusive lease. Up to 100,000 streams. Credit required as 'prod. YourName'. Not for resale."
                          className="w-full bg-background rounded-lg px-3 py-2 text-sm min-h-[80px]"
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleCreateProduct}
                    disabled={createProduct.isPending || uploadingProduct}
                    className="w-full"
                  >
                    {uploadingProduct
                      ? "Uploading..."
                      : createProduct.isPending
                        ? "Creating..."
                        : "Create Product"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {allProducts?.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-12 rounded bg-secondary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-primary/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{product.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {product.categoryName} &middot; {product.productType}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary font-display text-sm">
                      GHS {product.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.salesCount} sold
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-destructive mt-1"
                      disabled={deleteProduct.isPending}
                      onClick={() => {
                        if (!window.confirm(`Delete "${product.title}"? This can't be undone and will also remove its reviews.`)) return;
                        deleteProduct.mutate(
                          { id: product.id },
                          { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }) },
                        );
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!allProducts?.length && (
              <p className="text-muted-foreground text-sm text-center py-8">
                No products yet. Create your first product above.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Bookable Sessions</h2>
              <p className="text-sm text-muted-foreground">
                Publish specific times buyers can book for coaching or
                consultations.
              </p>
            </div>
            <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> New Slot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Publish a Session Slot</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {slotError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {slotError}
                    </div>
                  )}
                  <input
                    placeholder="Session title (e.g. 60-min business coaching call)"
                    value={slotForm.title}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, title: e.target.value })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder="What will you cover in this session?"
                    value={slotForm.description}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, description: e.target.value })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[70px]"
                  />
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Date &amp; time
                    </label>
                    <input
                      type="datetime-local"
                      value={slotForm.startsAt}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, startsAt: e.target.value })
                      }
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Uses your device's timezone. Buyers see it in theirs.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        min="15"
                        step="15"
                        value={slotForm.durationMinutes}
                        onChange={(e) =>
                          setSlotForm({
                            ...slotForm,
                            durationMinutes: e.target.value,
                          })
                        }
                        className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Price (GHS)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={slotForm.price}
                        onChange={(e) =>
                          setSlotForm({ ...slotForm, price: e.target.value })
                        }
                        className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <Select
                    value={slotForm.categoryId}
                    onValueChange={(v) =>
                      setSlotForm({ ...slotForm, categoryId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    placeholder="Call link (Zoom, Meet, WhatsApp video...)"
                    value={slotForm.meetingUrl}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, meetingUrl: e.target.value })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Joining notes (optional)"
                    value={slotForm.meetingNotes}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, meetingNotes: e.target.value })
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    The call link is only shown to the buyer after they pay.
                  </p>
                  <Button
                    onClick={handleCreateSlot}
                    disabled={createSlot.isPending}
                    className="w-full"
                  >
                    {createSlot.isPending ? "Publishing..." : "Publish Slot"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {slots?.map((slot: any) => {
              const isPast = new Date(slot.startsAt).getTime() < Date.now();
              return (
                <Card key={slot.id}>
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm">{slot.title}</h3>
                        <Badge
                          variant={
                            slot.status === "available"
                              ? "default"
                              : slot.status === "booked"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {slot.status}
                        </Badge>
                        {isPast && slot.status === "available" && (
                          <Badge variant="outline" className="text-xs">
                            expired
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {new Date(slot.startsAt).toLocaleString("en-GH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {slot.durationMinutes} min
                        </span>
                        <span>{slot.categoryName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="font-bold text-primary font-display text-sm mr-2">
                        GHS {slot.price.toFixed(2)}
                      </p>
                      {slot.status === "booked" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          disabled={completeSlot.isPending}
                          onClick={() =>
                            completeSlot.mutate(
                              { id: slot.id },
                              { onSuccess: refreshSlots },
                            )
                          }
                        >
                          Mark delivered
                        </Button>
                      )}
                      {slot.status === "booked" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-destructive"
                          disabled={cancelSlot.isPending}
                          onClick={() =>
                            cancelSlot.mutate(
                              { id: slot.id },
                              { onSuccess: refreshSlots },
                            )
                          }
                        >
                          Cancel
                        </Button>
                      )}
                      {slot.status === "available" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-destructive"
                          disabled={deleteSlot.isPending}
                          onClick={() =>
                            deleteSlot.mutate(
                              { id: slot.id },
                              { onSuccess: refreshSlots },
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!slots?.length && (
              <div className="text-center py-12">
                <CalendarClock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No session slots yet. Publish one above to start taking
                  bookings.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Customer Reviews</h2>
            <p className="text-sm text-muted-foreground">
              Every review across your courses, products and profile. Replying
              publicly shows buyers you're responsive.
            </p>
          </div>

          <div className="space-y-3">
            {allReviews?.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm">{review.userName}</p>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`h-3.5 w-3.5 ${
                                n <= review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/40"
                              }`}
                            />
                          ))}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {review.targetType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        on {review.itemTitle}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(review.createdAt).toLocaleDateString("en-GH", {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>

                  {review.comment && (
                    <p className="text-sm mb-3">{review.comment}</p>
                  )}

                  {review.vendorResponse ? (
                    <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
                      <MessageSquare className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium mb-1">
                          Your response
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {review.vendorResponse}
                        </p>
                      </div>
                    </div>
                  ) : respondingReviewId === review.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Reply publicly. Keep it professional — everyone can see this."
                        className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[70px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={
                            respondToReview.isPending || !responseText.trim()
                          }
                          onClick={() => handleRespond(review.id)}
                        >
                          {respondToReview.isPending
                            ? "Posting..."
                            : "Post response"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRespondingReviewId(null);
                            setResponseText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        setRespondingReviewId(review.id);
                        setResponseText("");
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" /> Respond
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {!allReviews?.length && (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No reviews yet. They'll appear here as buyers leave them.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activity?.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 border border-border/60 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(item.createdAt).toLocaleDateString("en-GH")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          {/* Lifetime totals — shown on every plan. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Your revenue (lifetime)
                </p>
                <p className="text-2xl font-bold font-display">
                  GHS {(analytics?.summary.totalRevenue ?? 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Units sold</p>
                <p className="text-2xl font-bold font-display">
                  {analytics?.summary.unitsSold ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Orders</p>
                <p className="text-2xl font-bold font-display">
                  {analytics?.summary.orderCount ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Free plan: locked state with a clear upsell rather than silently
              showing paid features to everyone. */}
          {analytics?.locked ? (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 mb-8">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">
                  Sales analytics are a Pro feature
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  {analytics.upgradeMessage}
                </p>
                <Button
                  className="rounded-full"
                  disabled={subscribeVendor.isPending}
                  onClick={() => handleUpgrade("pro")}
                >
                  Upgrade to Pro — GHS 80/mo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">
                  Revenue — last 12 months
                </h2>
                {analytics?.revenueTrend?.length ? (
                  <Card>
                    <CardContent className="p-5">
                      <div className="space-y-3">
                        {analytics.revenueTrend.map((point: any) => {
                          const peak = Math.max(
                            ...analytics.revenueTrend.map(
                              (p: any) => p.revenue,
                            ),
                            1,
                          );
                          return (
                            <div key={point.month}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-muted-foreground">
                                  {new Date(
                                    `${point.month}-01`,
                                  ).toLocaleDateString("en-GH", {
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="font-medium">
                                  GHS {point.revenue.toFixed(2)}
                                  <span className="text-muted-foreground text-xs ml-2">
                                    {point.units} sold
                                  </span>
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary rounded-full h-2 transition-all"
                                  style={{
                                    width: `${(point.revenue / peak) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No sales yet — your revenue trend will appear here.
                  </p>
                )}
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">
                  Best-selling listings
                </h2>
                {analytics?.topListings?.length ? (
                  <div className="space-y-2">
                    {analytics.topListings.map((listing: any, i: number) => (
                      <Card key={`${listing.title}-${i}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <span className="text-sm font-bold text-muted-foreground w-6 flex-shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {listing.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {listing.itemType} · {listing.units} sold
                            </p>
                          </div>
                          <p className="font-bold text-primary font-display text-sm flex-shrink-0">
                            GHS {listing.revenue.toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nothing sold yet.
                  </p>
                )}
              </div>

              {analytics?.advanced ? (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold">
                      Advanced analytics
                    </h2>
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Premium
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Repeat buyer rate
                        </p>
                        <p className="text-2xl font-bold font-display">
                          {analytics.advanced.repeatBuyerRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {analytics.advanced.repeatBuyers} of{" "}
                          {analytics.advanced.uniqueBuyers} buyers
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Average order value
                        </p>
                        <p className="text-2xl font-bold font-display">
                          GHS{" "}
                          {analytics.advanced.averageOrderValue.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Held in escrow
                        </p>
                        <p className="text-2xl font-bold font-display">
                          GHS{" "}
                          {analytics.advanced.fundsHeldInEscrow.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Awaiting buyer confirmation
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Your payout share
                        </p>
                        <p className="text-2xl font-bold font-display">
                          {analytics.advanced.payoutPercentage}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 mb-8">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-primary" />
                        <p className="font-medium text-sm">
                          Advanced analytics
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {analytics?.upgradeMessage}
                      </p>
                    </div>
                    <Button
                      className="rounded-full flex-shrink-0"
                      disabled={subscribeVendor.isPending}
                      onClick={() => handleUpgrade("premium")}
                    >
                      Go Premium — GHS 200/mo
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <h2 className="text-lg font-semibold mb-4">
            Marketplace category breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breakdown?.map((cat) => (
              <Card key={cat.categoryId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">
                      {cat.categoryName}
                    </h3>
                    <Badge variant="secondary">{cat.totalItems} items</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{cat.courseCount} courses</span>
                    <span>{cat.productCount} products</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-3">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (cat.totalItems /
                            Math.max(
                              1,
                              breakdown.reduce(
                                (max, c) => Math.max(max, c.totalItems),
                                1,
                              ),
                            )) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
