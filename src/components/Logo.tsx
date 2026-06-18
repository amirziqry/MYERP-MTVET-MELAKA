import { cn } from "@/lib/utils";
import logoAsset from "@/assets/tvet-logo.png";

const SIZES = {
  sm: "h-8 w-auto",
  md: "h-12 w-auto",
  lg: "h-24 w-auto",
} as const;

export function Logo({
  size = "sm",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <img
      src={logoAsset}
      alt="Majlis TVET Negeri Melaka"
      className={cn(SIZES[size], "object-contain", className)}
    />
  );
}