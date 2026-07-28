import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <img
                src="/brand/logo.png"
                alt=""
                aria-hidden="true"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
              />
              <span className="font-display font-bold text-2xl tracking-tight">
                BizzHive
              </span>
            </Link>
            <p className="text-white/70 text-sm mb-6 max-w-xs">
              Ghana's creative economy hub. Buy and sell digital products,
              courses, and freelance services in one vibrant marketplace.
            </p>
          </div>

          <div>
            <h3 className="font-bold font-display text-lg mb-4 text-accent">
              Marketplace
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/courses"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  All Courses
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Digital Products
                </Link>
              </li>
              <li>
                <Link
                  href="/vendors"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Top Creators
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold font-display text-lg mb-4 text-accent">
              For Creators
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/dashboard"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Vendor Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/how-to-sell"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  How to Sell
                </Link>
              </li>
              <li>
                <Link
                  href="/creator-guidelines"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Creator Guidelines
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold font-display text-lg mb-4 text-accent">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/help-center"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-policy"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/50 text-sm">
            &copy; {new Date().getFullYear()} BizzHive. Built for Ghana's
            creative economy.
          </p>
          <div className="flex gap-4">
            <span className="text-white/50 text-sm">GHS (₵)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
