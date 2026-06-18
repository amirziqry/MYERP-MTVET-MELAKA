import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { InlineSpinner } from "@/components/GlassSpinner";
import { Mail } from "lucide-react";

const otpTypes = [
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
  "email",
] as const;

const searchSchema = z.object({
  token_hash: z.string().min(1),
  type: z.enum(otpTypes),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth/confirm")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token_hash, type, next } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      });
      if (error) throw error;
      setDone(true);
      const target = next && next.startsWith("/") ? next : type === "recovery" ? "/reset-password" : "/projects";
      setTimeout(() => navigate({ to: target }), 400);
    } catch (err: any) {
      setError(err.message ?? "Verification failed");
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
          <h1 className="text-2xl font-bold tracking-tight">
            {type === "recovery" ? "Reset your password" : "Confirm your email"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {done
              ? "Success — redirecting…"
              : "Click the button below to finish. We use this extra step to keep email scanners from breaking your link."}
          </p>
          {error && (
            <p className="text-sm text-destructive">
              {error}
              <br />
              <Link to="/auth" className="underline">Back to sign in</Link>
            </p>
          )}
        </div>

        <Button
          onClick={confirm}
          disabled={busy || done}
          className="w-full rounded-2xl"
        >
          {busy && <InlineSpinner />}
          {busy ? "Verifying…" : done ? "Verified" : type === "recovery" ? "Continue" : "Confirm email"}
        </Button>
      </GlassCard>
    </div>
  );
}