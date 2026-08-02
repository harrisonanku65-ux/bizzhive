import { useState } from "react";
import { Link } from "wouter";
import {
  useListProducts,
  useListCategories,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, ShoppingBag, Search } from "lucide-react";

export default function Products() {
  // Seed from ?search= so the navbar search (and shared links) land on a
  // pre-filtered list rather than an empty one.
  const [search, setSearch] = useState(
    () => new URLSearchParams(window.location.search).get("search") ?? "",
  );
  const [categoryId, setCategoryId] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");

  const params: any = { sortBy };
  if (search) params.search = search;
  if (categoryId && categoryId !== "all")
    params.categoryId = parseInt(categoryId);
  if (type && type !== "all") params.type = type;

  const { data: products, isLoading } = useListProducts(params);
  const { data: categories } = useListCategories();

  return (
    <div className="theme-analogue min-h-screen bg-background container mx-auto px-4 py-8">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marketplace</span>
        <h1 className="text-3xl font-display font-bold mt-2 mb-2">
          Digital Products
        </h1>
        <p className="text-muted-foreground">
          Templates, ebooks, design assets, and more from Ghanaian creators
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 rounded-[17.6px] border border-border/70 bg-card p-4 shadow-none">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ebook">Ebook</SelectItem>
            <SelectItem value="template">Template</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="other">Other</SelectItem>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-72 rounded-[17.6px]" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="group overflow-hidden cursor-pointer rounded-[17.6px] shadow-none border-border/70 hover:border-primary/40 transition-all h-full">
                <div className="aspect-[4/3] bg-muted relative">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ShoppingBag className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <Badge variant="secondary" className="absolute top-3 left-3 rounded-full">
                    {product.productType}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {product.categoryName}
                  </p>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {product.vendorName}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium">
                      {product.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({product.salesCount} sold)
                    </span>
                  </div>
                  <span className="text-base font-bold text-primary font-display">
                    GHS {product.price.toFixed(2)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
