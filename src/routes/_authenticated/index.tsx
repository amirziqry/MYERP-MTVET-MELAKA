import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MYERP — TVET Melaka Trainer Application System" },
      { name: "description", content: "Modular trainer tender and project lifecycle for TVET Melaka." },
      { property: "og:title", content: "MYERP — TVET Melaka" },
      { property: "og:description", content: "Trainer tender and project lifecycle platform." },
    ],
  }),
  component: Index,
});

function Index() {
  const { loading, session, profile } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/auth" />;
  if (profile?.role === "admin") return <Navigate to="/admin" />;
  return <Navigate to="/projects" />;
}
