import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { InlineSpinner } from "@/components/GlassSpinner";

export const Route = createFileRoute("/unsubscribe")({
  ssr: false,
  component: UnsubscribePage,
});

type State = "loading" | "valid" | "invalid" | "already" | "done" | "error";

function UnsubscribePage() {
  const [state, setState] = useState<State>("loading");
  const [submitting, setSubmitting] = useState(false);
  const token = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token") ?? ""
    : "";

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) return setState("invalid");
        if (body.valid) return setState("valid");
        if (body.reason === "already_unsubscribed") return setState("already");
        setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(`/email/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await r.json().catch(() => ({}));
      if (body.success) setState("done");
      else if (body.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md text-center">
        <div className="flex flex-col items-center gap-3 mb-4">
          <Logo size="lg" />
          <h1 className="text-2xl font-bold">Email Preferences</h1>
        </div>
        {state === "loading" && <p className="text-muted-foreground"><InlineSpinner /> Checking your request…</p>}
        {state === "invalid" && <p className="text-muted-foreground">This unsubscribe link is invalid or has expired.</p>}
        {state === "already" && <p className="text-muted-foreground">You're already unsubscribed from these emails.</p>}
        {state === "error" && <p className="text-destructive">Something went wrong. Please try again later.</p>}
        {state === "valid" && (
          <div className="space-y-4">
            <p className="text-muted-foreground">Confirm you'd like to stop receiving emails from MYERP TVET Melaka.</p>
            <Button onClick={confirm} disabled={submitting} className="rounded-2xl w-full">
              {submitting && <InlineSpinner />}{submitting ? "Unsubscribing…" : "Confirm Unsubscribe"}
            </Button>
          </div>
        )}
        {state === "done" && <p className="text-emerald-500">You've been unsubscribed. We're sorry to see you go.</p>}
      </GlassCard>
    </div>
  );
}