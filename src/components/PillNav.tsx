import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

export interface PillNavItem<T extends string> {
  value: T;
  label: string;
  badge?: number | string;
}

interface PillNavProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: PillNavItem<T>[];
  className?: string;
  /** Force the mobile dropdown regardless of viewport. */
  forceDropdown?: boolean;
  /** Always render the row, never collapse. */
  alwaysRow?: boolean;
}

export function PillNav<T extends string>({
  value,
  onChange,
  options,
  className,
  forceDropdown,
  alwaysRow,
}: PillNavProps<T>) {
  const isMobile = useIsMobile();
  const collapse =
    !alwaysRow && options.length > 2 && (forceDropdown || isMobile);
  const current = options.find((o) => o.value === value) ?? options[0];

  if (collapse) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "glass inline-flex w-full items-center justify-between gap-2 rounded-full px-4 py-2 text-sm font-medium bg-primary text-white shadow-lg",
              className,
            )}
          >
            <span className="truncate capitalize">{current?.label}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="glass min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl border-white/10 p-1"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => onChange(opt.value)}
                className={cn(
                  "rounded-full px-3 py-2 text-sm capitalize cursor-pointer focus:bg-white/10",
                  active && "bg-primary/20 text-white",
                )}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.badge !== undefined && (
                  <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                    {opt.badge}
                  </span>
                )}
                {active && <Check className="ml-2 h-3.5 w-3.5" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={cn("glass inline-flex flex-wrap gap-1 rounded-full p-1", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium capitalize transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-foreground/80 hover:text-foreground hover:bg-white/5",
            )}
          >
            {opt.label}
            {opt.badge !== undefined && (
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xs",
                  active ? "bg-primary-foreground/20" : "bg-white/10",
                )}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}