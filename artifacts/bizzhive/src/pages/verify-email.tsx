import { Link, useSearch } from "wouter";
import { useVerifyEmail, getVerifyEmailQueryKey } from "@workspace/api-client-react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const searchString = useSearch();
  const token = new URLSearchParams(searchString).get("token") ?? "";

  const { data, isLoading, isError } = useVerifyEmail(
    { token },
    { query: { enabled: !!token, queryKey: getVerifyEmailQueryKey({ token }) } },
  );

  const status = !token ? "failed" : isLoading ? "loading" : isError ? "failed" : data?.status === "verified" ? "success" : "failed";

  return (
    <div className="container mx-auto px-4 py-16 text-center max-w-md">
      {status === "loading" && (
        <>
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold">Verifying your email...</h2>
          <p className="text-muted-foreground mt-2">This will just take a moment.</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Email verified!</h2>
          <p className="text-muted-foreground mb-6">{data?.email ?? "Your email"} is now confirmed.</p>
          <Link href="/"><Button>Continue to BizzHive</Button></Link>
        </>
      )}

      {status === "failed" && (
        <>
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Verification link invalid or expired</h2>
          <p className="text-muted-foreground mb-6">
            Sign in and use the "Resend verification email" option to get a new link.
          </p>
          <Link href="/login"><Button>Sign In</Button></Link>
        </>
      )}
    </div>
  );
}
