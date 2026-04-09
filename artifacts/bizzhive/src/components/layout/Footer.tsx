import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-primary text-primary-foreground p-1 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
              </div>
              <span className="font-display font-bold text-2xl tracking-tight">BizzHive</span>
            </Link>
            <p className="text-background/70 text-sm mb-6 max-w-xs">
              Ghana's creative economy hub. Buy and sell digital products, courses, and freelance services in one vibrant marketplace.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold font-display text-lg mb-4 text-accent">Marketplace</h3>
            <ul className="space-y-3">
              <li><Link href="/courses" className="text-background/70 hover:text-primary transition-colors text-sm">All Courses</Link></li>
              <li><Link href="/products" className="text-background/70 hover:text-primary transition-colors text-sm">Digital Products</Link></li>
              <li><Link href="/vendors" className="text-background/70 hover:text-primary transition-colors text-sm">Top Creators</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold font-display text-lg mb-4 text-accent">For Creators</h3>
            <ul className="space-y-3">
              <li><Link href="/dashboard" className="text-background/70 hover:text-primary transition-colors text-sm">Vendor Dashboard</Link></li>
              <li><Link href="#" className="text-background/70 hover:text-primary transition-colors text-sm">How to Sell</Link></li>
              <li><Link href="#" className="text-background/70 hover:text-primary transition-colors text-sm">Creator Guidelines</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold font-display text-lg mb-4 text-accent">Support</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-background/70 hover:text-primary transition-colors text-sm">Help Center</Link></li>
              <li><Link href="#" className="text-background/70 hover:text-primary transition-colors text-sm">Contact Us</Link></li>
              <li><Link href="#" className="text-background/70 hover:text-primary transition-colors text-sm">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/50 text-sm">
            &copy; {new Date().getFullYear()} BizzHive. Built for Ghana's creative economy.
          </p>
          <div className="flex gap-4">
            <span className="text-background/50 text-sm">GHS (₵)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}