import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { PillNav } from "@/components/PillNav";
import { RouteProgressLine } from "@/components/RouteProgressLine";

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const role = profile?.role ?? "general";

  type NavItem = { to: string; label: string };
  const baseNav: NavItem[] = [
    { to: "/projects", label: "Project MTVET Melaka" },
    { to: "/announcements", label: "Announcements" },
  ];
  const generalExtras: NavItem[] = role === "general" ? [{ to: "/register", label: "Become a Trainer" }] : [];
  const trainerExtras: NavItem[] = role === "trainer" ? [{ to: "/workspace", label: "My Dashboard" }] : [];
  const adminExtras: NavItem[] = role === "admin" ? [{ to: "/admin", label: "Admin" }] : [];

  const nav: NavItem[] = [...baseNav, ...generalExtras, ...trainerExtras, ...adminExtras];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 px-4 py-3 backdrop-blur-xl bg-background/30 border-b border-white/10 relative">
        <div className="mx-auto max-w-7xl flex items-center gap-3 sm:gap-4">
          <Link to="/projects" className="flex items-center gap-2 font-semibold text-lg shrink-0">
            <Logo size="sm" />
            <span className="hidden sm:inline">MYERP</span>
          </Link>
          <nav className="ml-auto min-w-0 flex-1 sm:flex-none flex justify-end">
            <PillNav
              value={nav.find((n) => pathname.startsWith(n.to))?.to ?? nav[0].to}
              onChange={(to) => navigate({ to: to as any })}
              options={nav.map((n) => ({ value: n.to, label: n.label }))}
              className="max-w-full"
            />
          </nav>
          <div className="hidden md:flex items-center gap-2 text-sm text-foreground/80 shrink-0">
            <span className="capitalize px-2 py-1 rounded-full bg-accent/20 text-accent-foreground/90 text-xs">{role}</span>
            <span className="truncate max-w-[120px]">{profile?.full_name || profile?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <RouteProgressLine />
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}