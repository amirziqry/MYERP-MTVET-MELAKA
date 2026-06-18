import { Cog } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "lg";

const sizes: Record<Size, { wrap: string; icon: string }> = {
  sm: { wrap: "h-4 w-4", icon: "h-3 w-3" },
  lg: { wrap: "h-14 w-14", icon: "h-7 w-7" },
};

export function GlassSpinner({
  size = "sm",
  className,
}: {
  size?: Size;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full glass motion-reduce:animate-none",
        s.wrap,
        className,
      )}
      aria-label="Loading"
      role="status"
    >
      <Cog className={cn("animate-spin text-primary motion-reduce:animate-none", s.icon)} />
    </span>
  );
}

export function FullScreenGlassSpinner({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <GlassSpinner size="lg" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

export function InlineSpinner({ className }: { className?: string }) {
  return (
    <Cog
      className={cn("animate-spin motion-reduce:animate-none", className)}
      aria-hidden
    />
  );
}