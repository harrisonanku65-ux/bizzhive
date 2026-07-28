import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { EmailVerificationBanner } from "./EmailVerificationBanner";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      <EmailVerificationBanner />
      <main className="flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}