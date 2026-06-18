import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { InlineSpinner } from "@/components/GlassSpinner";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  if (!loading && session) return <Navigate to="/projects" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=/projects`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        navigate({ to: "/check-email", search: { email } });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/projects" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
    else if (!result.redirected) navigate({ to: "/projects" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <Logo size="lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">MYERP</h1>
            <p className="text-sm text-muted-foreground">Majlis TVET Melaka Trainer System</p>
          </div>
        </div>

        <div className="glass mb-6 inline-flex rounded-full p-1 w-full">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                mode === m ? "bg-primary text-primary-foreground" : "text-foreground/80"
              }`}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 rounded-2xl bg-white/5" />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 rounded-2xl bg-white/5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Password</Label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 rounded-2xl bg-white/5"
            />
            {mode === "signup" && <PasswordStrengthMeter password={password} />}
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-2xl">
            {busy && <InlineSpinner />}
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="relative my-4 text-center text-xs text-muted-foreground">
          <span className="bg-transparent px-2">or</span>
        </div>

        <Button onClick={onGoogle} variant="outline" className="w-full rounded-2xl bg-white/5">
          Continue with Google
        </Button>
      </GlassCard>
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={email} />
    </div>
  );
}