import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogIn, Loader2, AlertCircle, ShoppingBag, Store } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoggingIn } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      // The generated client throws an ApiError with the parsed body on
      // `.data` — there is no axios-style `.response.data`, so the previous
      // lookup was always undefined and every failure showed the same
      // generic message instead of "Invalid email or password".
      setError(err?.data?.error ?? "Login failed. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Welcome Back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your BizzHive account</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <PasswordInput
              label="Password"
              name="current-password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full rounded-full" size="lg" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
              Sign In
            </Button>
          </form>

          <Separator />

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-3 text-center">
              <ShoppingBag className="h-5 w-5 text-secondary mx-auto mb-1" />
              <p className="text-xs font-medium">Buyer</p>
              <p className="text-[10px] text-muted-foreground">Buy courses & products</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
              <Store className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-medium">Seller</p>
              <p className="text-[10px] text-muted-foreground">Create & sell content</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
