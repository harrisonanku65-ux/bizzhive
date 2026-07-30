import { useState } from "react";
import {
  useCreateSupportTicket,
  useGetSupportPriority,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Contact() {
  const { user } = useAuth();
  const { data: priority } = useGetSupportPriority();
  const createTicket = useCreateSupportTicket();

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    requesterRole: "other" as "buyer" | "seller" | "other",
  });
  const [submitted, setSubmitted] = useState<{ expectedResponse: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Prefill from the signed-in account, but leave it editable.
  const name = form.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const email = form.email || user?.email || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.message.trim().length < 10) {
      setError("Please describe your issue in a little more detail.");
      return;
    }

    createTicket.mutate(
      {
        data: {
          name,
          email,
          subject: form.subject || "General enquiry",
          message: form.message.trim(),
          requesterRole: form.requesterRole,
        },
      },
      {
        onSuccess: (res: any) => {
          setSubmitted({ expectedResponse: res.expectedResponse });
          setForm({
            name: "",
            email: "",
            subject: "",
            message: "",
            requesterRole: "other",
          });
        },
        onError: () =>
          setError("We couldn't send that. Please try again, or email us directly."),
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">Support</span>
      <h1 className="text-3xl font-display font-bold mt-2 mb-6">Contact Us</h1>
      <p className="text-muted-foreground mb-8">
        Have a question, ran into an issue, or need help with an order? Send us a
        message below, or reach out through either channel directly.
      </p>

      {priority?.priority === "priority" && (
        <div className="mb-8 flex items-start gap-3 rounded-md border border-primary/30 bg-card p-4">
          <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium">Premium priority support</p>
              <Badge className="rounded-sm bg-primary/10 text-primary border-primary/20">
                Premium
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Your messages jump the queue and we aim to reply within a few
              hours.
            </p>
          </div>
        </div>
      )}

      {priority?.priority === "standard" && (
        <div className="mb-8 flex items-start gap-3 rounded-md border border-border/70 bg-card p-4">
          <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Pro support</p>
            <p className="text-muted-foreground">
              We aim to reply to Pro sellers within one business day.
            </p>
          </div>
        </div>
      )}

      {submitted ? (
        <Card className="mb-8 rounded-md shadow-none border-green-200 bg-green-50/50">
          <CardContent className="p-6 flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="font-semibold mb-1">Message received</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {submitted.expectedResponse}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitted(null)}
              >
                Send another message
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8 rounded-md shadow-none border-border/70">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Name</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-muted rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-muted rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">I amâ€¦</label>
                  <Select
                    value={form.requesterRole}
                    onValueChange={(v) =>
                      setForm({ ...form, requesterRole: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seller">
                        A seller â€” I list services
                      </SelectItem>
                      <SelectItem value="buyer">
                        A buyer â€” I have a question
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Subject
                  </label>
                  <input
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                    placeholder="What's this about?"
                    className="w-full bg-muted rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Message</label>
                <textarea
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us what's going on. If it's about an order, include the order number."
                  className="w-full bg-muted rounded-md px-3 py-2 text-sm min-h-[140px]"
                />
              </div>

              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="mailto:bizzhive001@gmail.com"
          className="flex items-center gap-3 border border-border/70 bg-card rounded-md p-5 hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Email</p>
            <p className="text-muted-foreground text-sm">
              bizzhive001@gmail.com
            </p>
          </div>
        </a>
        <a
          href="https://wa.me/233559401561"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 border border-border/70 bg-card rounded-md p-5 hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">WhatsApp</p>
            <p className="text-muted-foreground text-sm">+233 55 940 1561</p>
          </div>
        </a>
      </div>
    </div>
  );
}
