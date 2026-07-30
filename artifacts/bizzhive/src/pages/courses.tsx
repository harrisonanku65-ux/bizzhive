import { useState } from "react";
import { Link } from "wouter";
import { useListCourses, useListCategories } from "@workspace/api-client-react";
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
import { Star, BookOpen, Search } from "lucide-react";
import { useSearch } from "wouter";

export default function Courses() {
  const searchString = useSearch();
  // Seed from ?search= so navbar searches and shared links land pre-filtered,
  // matching the products page.
  const [search, setSearch] = useState(
    () => new URLSearchParams(searchString).get("search") ?? "",
  );
  const initialCategoryId =
    new URLSearchParams(searchString).get("categoryId") ?? "";
  const [categoryId, setCategoryId] = useState<string>(initialCategoryId);
  const [level, setLevel] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");

  const params: any = { sortBy };
  if (search) params.search = search;
  if (categoryId && categoryId !== "all")
    params.categoryId = parseInt(categoryId);
  if (level && level !== "all") params.level = level;

  const { data: courses, isLoading } = useListCourses(params);
  const { data: categories } = useListCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Browse</span>
        <h1 className="text-3xl font-display font-bold mt-2 mb-2">Online Courses</h1>
        <p className="text-muted-foreground">
          Learn from Ghana's best creators and experts
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 rounded-md border border-border/70 bg-card p-4 shadow-none">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted rounded-md pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="price_low">Price: Low to High</SelectItem>
            <SelectItem value="price_high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80 rounded-md" />
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="group overflow-hidden cursor-pointer rounded-md shadow-none border-border/70 hover:border-primary/40 hover:shadow-md transition-all h-full">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <Badge className="absolute top-3 left-3 rounded-sm">
                    {course.level}
                  </Badge>
                </div>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">
                    {course.categoryName}
                  </p>
                  <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {course.vendorName}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium">
                        {course.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ({course.reviewsCount})
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {course.lessonsCount} lessons
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <span className="text-lg font-bold text-primary font-display">
                      GHS {course.price.toFixed(2)}
                    </span>
                    {course.duration && (
                      <span className="text-xs text-muted-foreground">
                        {course.duration}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No courses found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
