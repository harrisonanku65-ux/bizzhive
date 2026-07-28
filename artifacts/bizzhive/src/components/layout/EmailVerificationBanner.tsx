import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useResendVerificationEmail } from "@workspace/api-client-react";
import { Mail } from "lucide-react";

export function EmailVerificationBanner() {
  const { user, isAuthenticated } = useAuth();
  const resend = useResendVerificationEmail();
  const [message, setMessage] = useState("");

  if (!isAuthenticated || !user || user.emailVerified) return null;

  const handleResend = () => {
    setMessage("");
    resend.mutate(undefined, {
      onSuccess: (data) => {
        setMessage(
          data.status === "already_verified"
            ? "Your email is already verified — refresh the page."
            : "Verification email sent — check your inbox.",
        );
      },
      onError: (err: any) => {
        setMessage(err?.data?.error ?? "Couldn't send the email. Try again in a moment.");
      },
    });
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-2 text-center">
        <Mail className="h-4 w-4 flex-shrink-0" />
        <span>Please verify your email address.</span>
        {message ? (
          <span className="font-medium">{message}</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={resend.isPending}
            className="underline font-medium hover:no-underline disabled:opacity-50"
          >
            {resend.isPending ? "Sending..." : "Resend verification email"}
          </button>
        )}
      </div>
    </div>
  );
}
