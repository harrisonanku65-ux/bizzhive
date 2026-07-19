import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle, User, Store, ShoppingBag, CheckCircle } from "lucide-react";

type AccountType = "buyer" | "seller";

export default function Signup() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountType, setAccountType] = useState<AccountType>("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorBio, setVendorBio] = useState("");
  const [vendorLocation, setVendorLocation] = useState("");
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const { register, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!agreeTerms) { setError("Please agree to the terms"); return; }

    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        displayName: displayName || `${firstName} ${lastName}`,
        role: accountType,
        phone: phone || undefined,
        vendorName: accountType === "seller" ? (vendorName || displayName || `${firstName} ${lastName}`) : undefined,
        vendorBio: accountType === "seller" ? vendorBio : undefined,
        vendorLocation: accountType === "seller" ? vendorLocation : undefined,
      });
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Registration failed. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-display font-bold mb-2">Join BizzHive</h1>
        <p className="text-muted-foreground text-sm">
          {step === 1 ? "Choose your account type to get started" :
           step === 2 ? "Tell us about yourself" :
           "Complete your registration"}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex items-center gap-1`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${s <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {s < step ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-center">I want to...</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => { setAccountType("buyer"); setStep(2); }}
                  className={`border-2 rounded-2xl p-6 text-left transition-all hover:border-primary/40 hover:shadow-md ${accountType === "buyer" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <ShoppingBag className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold text-lg">Buy & Learn</h3>
                  <p className="text-sm text-muted-foreground mt-1">Purchase courses and digital products from creators</p>
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-primary" /> Browse marketplace</p>
                    <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-primary" /> Buy courses & products</p>
                    <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-primary" /> Track orders</p>
                  </div>
                </button>
                <button
                  onClick={() => { setAccountType("seller"); setStep(2); }}
                  className={`border-2 rounded-2xl p-6 text-left transition-all hover:border-primary/40 hover:shadow-md ${accountType === "seller" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <Store className="h-8 w-8 text-secondary mb-3" />
                  <h3 className="font-semibold text-lg">Create & Sell</h3>
                  <p className="text-sm text-muted-foreground mt-1">Sell courses, products, and get automatic payouts</p>
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-primary" /> Create courses & products</p>
                    <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-primary" /> Set up MoMo payouts</p>
                    <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-primary" /> Analytics dashboard</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">First Name</label>
                  <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Last Name</label>
                  <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={`${firstName} ${lastName}`} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone (optional)</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0244000000" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-full">Back</Button>
                <Button type="submit" className="flex-1 rounded-full">Continue</Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Password</label>
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Confirm Password</label>
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {accountType === "seller" && (
                <div className="space-y-3 bg-secondary/5 rounded-xl p-4 border border-secondary/20">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Store className="h-4 w-4 text-secondary" />
                    Seller Profile
                  </p>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Store / Creator Name</label>
                    <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder={displayName || `${firstName} ${lastName}`} className="w-full bg-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Bio / About You</label>
                    <textarea value={vendorBio} onChange={(e) => setVendorBio(e.target.value)} placeholder="Tell buyers about yourself..." className="w-full bg-white rounded-lg px-3 py-2.5 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Location</label>
                    <input value={vendorLocation} onChange={(e) => setVendorLocation(e.target.value)} placeholder="e.g. Accra, Ghana" className="w-full bg-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border" />
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5" />
                <span className="text-muted-foreground">I agree to the <span className="text-primary">Terms of Service</span> and <span className="text-primary">Privacy Policy</span></span>
              </label>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-full">Back</Button>
                <Button type="submit" className="flex-1 rounded-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <User className="h-4 w-4 mr-2" />}
                  Create Account
                </Button>
              </div>
            </form>
          )}

          <Separator />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
