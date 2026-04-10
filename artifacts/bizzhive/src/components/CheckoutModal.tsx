import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useInitializePayment, verifyPayment, verifyFlutterwavePayment } from "@workspace/api-client-react";
import { CreditCard, Smartphone, Loader2, CheckCircle, AlertCircle } from "lucide-react";

declare global {
  interface Window {
    PaystackPop: any;
    FlutterwaveCheckout: any;
  }
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onSuccess: () => void;
}

type PaymentProvider = "paystack" | "flutterwave";
type MomoNetwork = "MTN" | "Vodafone" | "AirtelTigo";
type PaymentMethod = "card" | "mobile_money";

export function CheckoutModal({ open, onOpenChange, total, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<"details" | "processing" | "success" | "error">("details");
  const [provider, setProvider] = useState<PaymentProvider>("paystack");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [network, setNetwork] = useState<MomoNetwork>("MTN");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const initPayment = useInitializePayment();

  function momoCode(n: MomoNetwork) {
    return n === "MTN" ? "mtn" : n === "Vodafone" ? "vod" : "atl";
  }

  async function handleVerifyPaystack(reference: string) {
    try {
      const result = await verifyPayment(reference);
      if (result.status === "success") {
        setStep("success");
        setTimeout(() => { onSuccess(); onOpenChange(false); }, 2000);
      } else {
        setErrorMsg(result.message ?? "Payment verification failed");
        setStep("error");
      }
    } catch {
      setErrorMsg("Failed to verify payment");
      setStep("error");
    }
  }

  async function handleVerifyFlutterwave(transactionId: string, reference: string) {
    try {
      const result = await verifyFlutterwavePayment({ transactionId, reference });
      if (result.status === "success") {
        setStep("success");
        setTimeout(() => { onSuccess(); onOpenChange(false); }, 2000);
      } else {
        setErrorMsg("Payment verification failed");
        setStep("error");
      }
    } catch {
      setErrorMsg("Failed to verify payment");
      setStep("error");
    }
  }

  const handlePay = () => {
    if (!email) { setErrorMsg("Email is required"); return; }
    if (method === "mobile_money" && !phone) { setErrorMsg("Phone number is required for mobile money"); return; }
    setErrorMsg("");
    setStep("processing");

    initPayment.mutate({
      data: {
        provider,
        email,
        phone: phone || undefined,
        momoNetwork: method === "mobile_money" ? network : undefined,
        paymentMethod: method,
      }
    }, {
      onSuccess: (data) => {
        if (provider === "paystack") {
          if (window.PaystackPop && data.paystackPublicKey) {
            const popup = window.PaystackPop.setup({
              key: data.paystackPublicKey,
              email,
              amount: Math.round(data.amount * 100),
              currency: "GHS",
              ref: data.reference,
              ...(method === "mobile_money" ? {
                channels: ["mobile_money"],
                mobile_money: { phone, provider: momoCode(network) },
              } : {}),
              onSuccess: () => { handleVerifyPaystack(data.reference); },
              onCancel: () => { setStep("details"); },
            });
            popup.openIframe();
          } else if (data.paymentUrl) {
            window.open(data.paymentUrl, "_blank");
            setStep("details");
          } else {
            setStep("success");
            setTimeout(() => { onSuccess(); onOpenChange(false); }, 2000);
          }
        } else if (provider === "flutterwave") {
          if (window.FlutterwaveCheckout && data.flutterwavePublicKey) {
            window.FlutterwaveCheckout({
              public_key: data.flutterwavePublicKey,
              tx_ref: data.reference,
              amount: data.amount,
              currency: "GHS",
              payment_options: method === "mobile_money" ? "mobilemoneygm" : "card",
              customer: { email, phone_number: phone, name: email.split("@")[0] },
              customizations: { title: "BizzHive", description: "Marketplace Payment" },
              callback: (response: any) => {
                handleVerifyFlutterwave(String(response.transaction_id), data.reference);
              },
              onclose: () => { setStep("details"); },
            });
          } else if (data.paymentUrl) {
            window.open(data.paymentUrl, "_blank");
            setStep("details");
          } else {
            setStep("success");
            setTimeout(() => { onSuccess(); onOpenChange(false); }, 2000);
          }
        }
      },
      onError: (err: any) => {
        setErrorMsg(err?.message ?? "Failed to initialize payment");
        setStep("error");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setStep("details"); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Checkout</DialogTitle>
        </DialogHeader>

        {step === "processing" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="font-medium">Initializing payment...</p>
            <p className="text-sm text-muted-foreground">Please wait, opening payment window</p>
          </div>
        )}

        {step === "success" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-display font-bold">Payment Successful!</h3>
            <p className="text-muted-foreground text-sm text-center">Your order has been confirmed. Redirecting...</p>
          </div>
        )}

        {step === "error" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="font-medium text-destructive">{errorMsg}</p>
            <Button onClick={() => setStep("details")} variant="outline">Try Again</Button>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-5">
            <div className="bg-muted/60 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Order Total</span>
              <span className="text-xl font-bold text-primary font-display">GHS {total.toFixed(2)}</span>
            </div>

            {errorMsg && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{errorMsg}</p>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Payment Gateway</label>
              <div className="grid grid-cols-2 gap-2">
                {(["paystack", "flutterwave"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`border-2 rounded-xl p-3 text-sm font-medium transition-all text-left ${provider === p ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    {p === "paystack" ? "🔵 Paystack" : "🟠 Flutterwave"}
                    <p className="text-xs font-normal mt-0.5 opacity-70">{p === "paystack" ? "Card, MTN, Vodafone" : "Card, Mobile Money"}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod("card")}
                  className={`border-2 rounded-xl p-3 flex items-center gap-2 text-sm font-medium transition-all ${method === "card" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  <CreditCard className="h-4 w-4" />
                  Card Payment
                </button>
                <button
                  onClick={() => setMethod("mobile_money")}
                  className={`border-2 rounded-xl p-3 flex items-center gap-2 text-sm font-medium transition-all ${method === "mobile_money" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile Money
                </button>
              </div>
            </div>

            {method === "mobile_money" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Mobile Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["MTN", "Vodafone", "AirtelTigo"] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setNetwork(n)}
                      className={`border-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${network === n ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >
                      {n === "MTN" ? "🟡 MTN" : n === "Vodafone" ? "🔴 Vodafone" : "🔵 AirtelTigo"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {method === "mobile_money" && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="0244000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
            </div>

            <Button className="w-full rounded-full" size="lg" onClick={handlePay} disabled={initPayment.isPending}>
              {initPayment.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Initializing...</>
              ) : (
                `Pay GHS ${total.toFixed(2)}`
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              🔒 Secured by {provider === "paystack" ? "Paystack" : "Flutterwave"} · 256-bit SSL encryption
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
