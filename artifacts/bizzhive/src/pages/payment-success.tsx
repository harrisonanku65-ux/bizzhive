import { Link } from "wouter";
import { useVerifyPayment } from "@workspace/api-client-react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference") || params.get("trxref") || "";

  const { data, isLoading, isError } = useVerifyPayment(reference, {
    query: { enabled: !!reference, retry: 2 }
  });

  const status = !reference ? "success" : isLoading ? "loading" : isError ? "failed" : data?.status === "success" ? "success" : "failed";

  return (
    <div className="container mx-auto px-4 py-16 text-center max-w-md">
      {status === "loading" && (
        <>
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold">Verifying Payment...</h2>
          <p className="text-muted-foreground mt-2">Please wait while we confirm your payment</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground mb-6">Your order has been confirmed. You'll receive your digital products shortly.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/orders"><Button>View Orders</Button></Link>
            <Link href="/courses"><Button variant="outline">Continue Shopping</Button></Link>
          </div>
        </>
      )}

      {status === "failed" && (
        <>
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Payment Not Confirmed</h2>
          <p className="text-muted-foreground mb-6">We couldn't verify your payment. If money was deducted, please contact support.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/cart"><Button>Return to Cart</Button></Link>
          </div>
        </>
      )}
    </div>
  );
}
