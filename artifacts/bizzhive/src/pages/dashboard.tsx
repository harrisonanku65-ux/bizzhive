import { useState } from "react";
import { useGetDashboardStats, useGetRecentActivity, useGetCategoryBreakdown, useListCourses, useListProducts, useCreateCourse, useCreateProduct, useCreateLesson, getListCoursesQueryKey, getListProductsQueryKey, useListCategories } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { BookOpen, ShoppingBag, Users, DollarSign, TrendingUp, Plus, BarChart3 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: activity } = useGetRecentActivity();
  const { data: breakdown } = useGetCategoryBreakdown();
  const { data: allCourses } = useListCourses({ vendorId: 1 });
  const { data: allProducts } = useListProducts({ vendorId: 1 });
  const { data: categories } = useListCategories();
  const createCourse = useCreateCourse();
  const createProduct = useCreateProduct();
  const createLesson = useCreateLesson();
  const queryClient = useQueryClient();

  const [courseForm, setCourseForm] = useState({ title: "", description: "", price: "", level: "beginner", categoryId: "", duration: "" });
  const [productForm, setProductForm] = useState({ title: "", description: "", price: "", productType: "ebook", categoryId: "" });
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const handleCreateCourse = () => {
    if (!courseForm.title || !courseForm.price || !courseForm.categoryId) return;
    createCourse.mutate({ data: {
      title: courseForm.title,
      description: courseForm.description,
      price: parseFloat(courseForm.price),
      level: courseForm.level as any,
      categoryId: parseInt(courseForm.categoryId),
      vendorId: 1,
      duration: courseForm.duration,
    }}, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        setCourseDialogOpen(false);
        setCourseForm({ title: "", description: "", price: "", level: "beginner", categoryId: "", duration: "" });
      }
    });
  };

  const handleCreateProduct = () => {
    if (!productForm.title || !productForm.price || !productForm.categoryId) return;
    createProduct.mutate({ data: {
      title: productForm.title,
      description: productForm.description,
      price: parseFloat(productForm.price),
      productType: productForm.productType as any,
      categoryId: parseInt(productForm.categoryId),
      vendorId: 1,
    }}, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setProductDialogOpen(false);
        setProductForm({ title: "", description: "", price: "", productType: "ebook", categoryId: "" });
      }
    });
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Vendor Dashboard</h1>
          <p className="text-muted-foreground">Manage your courses and products</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{stats?.totalCourses ?? 0}</p>
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
                <p className="text-2xl font-bold font-display">{stats?.totalProducts ?? 0}</p>
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
                <p className="text-2xl font-bold font-display">GHS {(stats?.totalRevenue ?? 0).toFixed(0)}</p>
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
                <p className="text-2xl font-bold font-display">{stats?.totalVendors ?? 0}</p>
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
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Courses</h2>
            <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> New Course</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Course</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <input placeholder="Course Title" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="w-full bg-muted rounded-lg px-3 py-2 text-sm" />
                  <textarea placeholder="Description" value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[80px]" />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Price (GHS)" type="number" value={courseForm.price} onChange={e => setCourseForm({...courseForm, price: e.target.value})} className="w-full bg-muted rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Duration (e.g. 10 hours)" value={courseForm.duration} onChange={e => setCourseForm({...courseForm, duration: e.target.value})} className="w-full bg-muted rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={courseForm.level} onValueChange={v => setCourseForm({...courseForm, level: v})}>
                      <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={courseForm.categoryId} onValueChange={v => setCourseForm({...courseForm, categoryId: v})}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateCourse} disabled={createCourse.isPending} className="w-full">
                    {createCourse.isPending ? "Creating..." : "Create Course"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {allCourses?.map(course => (
              <Card key={course.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-12 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-primary/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{course.title}</h3>
                    <p className="text-xs text-muted-foreground">{course.categoryName} &middot; {course.level} &middot; {course.lessonsCount} lessons</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary font-display text-sm">GHS {course.price.toFixed(2)}</p>
                    <Badge variant={course.published ? "default" : "secondary"} className="text-xs mt-1">
                      {course.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Products</h2>
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> New Product</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Product</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <input placeholder="Product Title" value={productForm.title} onChange={e => setProductForm({...productForm, title: e.target.value})} className="w-full bg-muted rounded-lg px-3 py-2 text-sm" />
                  <textarea placeholder="Description" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full bg-muted rounded-lg px-3 py-2 text-sm min-h-[80px]" />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Price (GHS)" type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full bg-muted rounded-lg px-3 py-2 text-sm" />
                    <Select value={productForm.productType} onValueChange={v => setProductForm({...productForm, productType: v})}>
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ebook">Ebook</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={productForm.categoryId} onValueChange={v => setProductForm({...productForm, categoryId: v})}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateProduct} disabled={createProduct.isPending} className="w-full">
                    {createProduct.isPending ? "Creating..." : "Create Product"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {allProducts?.map(product => (
              <Card key={product.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-12 rounded bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="h-6 w-6 text-primary/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{product.title}</h3>
                    <p className="text-xs text-muted-foreground">{product.categoryName} &middot; {product.productType}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary font-display text-sm">GHS {product.price.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{product.salesCount} sold</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activity?.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 border border-border/60 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleDateString("en-GH")}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breakdown?.map(cat => (
              <Card key={cat.categoryId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{cat.categoryName}</h3>
                    <Badge variant="secondary">{cat.totalItems} items</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{cat.courseCount} courses</span>
                    <span>{cat.productCount} products</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-3">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(100, (cat.totalItems / Math.max(1, breakdown.reduce((max, c) => Math.max(max, c.totalItems), 1))) * 100)}%` }}
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
