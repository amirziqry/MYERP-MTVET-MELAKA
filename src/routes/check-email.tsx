import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { InlineSpinner } from "@/components/GlassSpinner";

const searchSchema = z.object({ email: z.string().email().optional() });

export const Route = createFileRoute("/check-email")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!email) navigate({ to: "/auth" });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    if (!email || cooldown > 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/projects`,
        },
      });
      if (error) throw error;
      toast.success("Verification email resent");
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to resend");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md text-center">
        <div className="flex flex-col items-center gap-3 mb-6">
          <Logo size="lg" />
          <div className="mt-2 rounded-full bg-primary/10 p-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Click the link in
            the email to activate your account.
          </p>
          <p className="text-xs text-muted-foreground">
            Can't find it? Check your spam or junk folder. Work email filters can delay or
            block the message — it may take a few minutes to arrive.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={resend}
            disabled={busy || cooldown > 0}
            variant="outline"
            className="w-full rounded-2xl bg-white/5"
          >
            {busy && <InlineSpinner />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : busy ? "Sending…" : "Resend email"}
          </Button>
          <Button asChild variant="ghost" className="w-full rounded-2xl">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}