import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetCart } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const [location] = useLocation();
  const { data: cart } = useGetCart();

  const cartItemCount = cart?.itemCount || 0;

  const NavLinks = () => (
    <>
      <Link href="/courses" className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith('/courses') ? 'text-primary' : 'text-foreground/80'}`}>
        Courses
      </Link>
      <Link href="/products" className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith('/products') ? 'text-primary' : 'text-foreground/80'}`}>
        Digital Products
      </Link>
      <Link href="/vendors" className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith('/vendors') ? 'text-primary' : 'text-foreground/80'}`}>
        Creators
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/" className="text-lg font-bold mb-4 font-display text-primary">BizzHive</Link>
                <Link href="/courses" className="text-lg font-medium">Courses</Link>
                <Link href="/products" className="text-lg font-medium">Digital Products</Link>
                <Link href="/vendors" className="text-lg font-medium">Creators</Link>
                <Link href="/dashboard" className="text-lg font-medium">Dashboard</Link>
              </nav>
            </SheetContent>
          </Sheet>
          
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">BizzHive</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 ml-6">
            <NavLinks />
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative hidden sm:block w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search Makola market..."
              className="w-full bg-muted rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative hover-elevate">
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full bg-accent text-accent-foreground border-none">
                  {cartItemCount}
                </Badge>
              )}
              <span className="sr-only">Cart</span>
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                  <User className="h-4 w-4" />
                </div>
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">Kwame Osei</p>
                  <p className="w-[200px] truncate text-xs text-muted-foreground">
                    kwame@bizzhive.gh
                  </p>
                </div>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="w-full cursor-pointer">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/orders" className="w-full cursor-pointer">My Orders</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}