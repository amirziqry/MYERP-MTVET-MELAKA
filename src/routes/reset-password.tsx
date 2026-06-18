import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { InlineSpinner } from "@/components/GlassSpinner";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/projects" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <Logo size="lg" />
          <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
          {hasSession === false && (
            <p className="text-sm text-destructive">
              Your reset link wasn't validated. Please request a new password reset email.
            </p>
          )}
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>New password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 rounded-2xl bg-white/5" />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="mt-1 rounded-2xl bg-white/5" />
          </div>
          <Button type="submit" disabled={busy || !hasSession} className="w-full rounded-2xl">
            {busy && <InlineSpinner />}
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}