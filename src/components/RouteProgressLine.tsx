import { useRouterState } from "@tanstack/react-router";

export function RouteProgressLine() {
  const isLoading = useRouterState({
    select: (s) => s.isLoading || s.isTransitioning,
  });
  if (!isLoading) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-px h-[2px] overflow-hidden"
    >
      <div className="route-progress-shimmer h-full w-1/3 motion-reduce:animate-none" />
    </div>
  );
}