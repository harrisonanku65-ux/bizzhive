import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart,
  Menu,
  Search,
  User,
  LogIn,
  LogOut,
  LayoutDashboard,
  Package,
  ChevronDown,
  Store,
  CalendarClock,
  Settings,
} from "lucide-react";
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
import { useState } from "react";

export function Navbar() {
  const [location, navigate] = useLocation();
  const { data: cart } = useGetCart();
  const { user, isAuthenticated, isSeller, logout } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  const cartItemCount = cart?.itemCount || 0;
  const displayName =
    user?.displayName ??
    user?.firstName ??
    user?.email?.split("@")[0] ??
    "User";
  const userInitial = displayName.charAt(0).toUpperCase();

  const NavLinks = () => (
    <>
      <Link
        href="/courses"
        className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/courses") ? "text-primary" : "text-foreground/80"}`}
      >
        Courses
      </Link>
      <Link
        href="/products"
        className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/products") ? "text-primary" : "text-foreground/80"}`}
      >
        Digital Products
      </Link>
      <Link
        href="/sessions"
        className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/sessions") ? "text-primary" : "text-foreground/80"}`}
      >
        Book a Session
      </Link>
      <Link
        href="/gaming-hub"
        className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/gaming-hub") ? "text-primary" : "text-foreground/80"}`}
      >
        Gaming Hub
      </Link>
      <Link
        href="/vendors"
        className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/vendors") ? "text-primary" : "text-foreground/80"}`}
      >
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
                <Link
                  href="/"
                  className="text-lg font-bold mb-4 font-display text-primary"
                >
                  BizzHive
                </Link>
                <Link href="/courses" className="text-lg font-medium">
                  Courses
                </Link>
                <Link href="/products" className="text-lg font-medium">
                  Digital Products
                </Link>
                <Link href="/sessions" className="text-lg font-medium">
                  Book a Session
                </Link>
                <Link href="/gaming-hub" className="text-lg font-medium">
                  Gaming Hub
                </Link>
                <Link href="/vendors" className="text-lg font-medium">
                  Creators
                </Link>
                {isSeller && (
                  <Link href="/dashboard" className="text-lg font-medium">
                    Dashboard
                  </Link>
                )}
                {!isAuthenticated && (
                  <>
                    <Link href="/login" className="text-lg font-medium">
                      Sign In
                    </Link>
                    <Link href="/signup" className="text-lg font-medium">
                      Create Account
                    </Link>
                  </>
                )}
                {isAuthenticated && (
                  <>
                    <Link href="/orders" className="text-lg font-medium">
                      My Orders
                    </Link>
                    <Link href="/bookings" className="text-lg font-medium">
                      My Bookings
                    </Link>
                    <Link href="/settings" className="text-lg font-medium">
                      Account Settings
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2">
            <img
              src="/brand/logo.png"
              alt="BizzHive"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0"
            />
            <span className="font-display font-bold text-xl tracking-tight">
              BizzHive
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 ml-6">
            <NavLinks />
            {isSeller && (
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/dashboard") ? "text-primary" : "text-foreground/80"}`}
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* This input was previously inert — no state, no handler, and a
              placeholder ("Search Makola market…") describing a physical
              market rather than a digital one. It now submits to the products
              listing, which reads ?search= on mount. */}
          <form
            onSubmit={handleSearch}
            role="search"
            className="relative hidden sm:block w-64"
          >
            <label htmlFor="site-search" className="sr-only">
              Search BizzHive
            </label>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="site-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search courses, beats, templates…"
              className="w-full bg-muted rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          <Link href="/cart">
            <Button
              variant="ghost"
              size="icon"
              className="relative hover-elevate"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full bg-accent text-accent-foreground border-none">
                  {cartItemCount}
                </Badge>
              )}
              <span className="sr-only">Cart</span>
            </Button>
          </Link>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full flex items-center gap-2 px-2.5"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {userInitial}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {displayName}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2 border-b border-border/40 mb-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {userInitial}
                  </div>
                  <div className="flex flex-col leading-none">
                    <p className="font-medium text-sm">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate w-[180px]">
                      {user?.email}
                    </p>
                    {isSeller && (
                      <span className="text-[10px] mt-0.5 font-medium text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full self-start">
                        Seller
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link
                    href="/orders"
                    className="w-full cursor-pointer flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" /> My Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/bookings"
                    className="w-full cursor-pointer flex items-center gap-2"
                  >
                    <CalendarClock className="h-4 w-4" /> My Bookings
                  </Link>
                </DropdownMenuItem>
                {isSeller && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard"
                      className="w-full cursor-pointer flex items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="w-full cursor-pointer flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" /> Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex rounded-full"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="rounded-full">
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
