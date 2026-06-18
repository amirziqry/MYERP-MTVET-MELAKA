import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { FullScreenGlassSpinner } from "@/components/GlassSpinner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

function AuthGate() {
  const { session, loading, profile } = useAuth();
  if (loading) {
    return <FullScreenGlassSpinner label="Loading…" />;
  }
  if (!session) return <Navigate to="/auth" />;
  if (!profile) {
    return <FullScreenGlassSpinner label="Setting up your profile…" />;
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}