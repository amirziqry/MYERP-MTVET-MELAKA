import { Check, Circle } from "lucide-react";
import { evaluatePassword, PASSWORD_REQUIREMENTS } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

const BAR_COLORS = [
  "bg-muted",
  "bg-destructive",
  "bg-amber-500",
  "bg-yellow-400",
  "bg-emerald-500",
];

const LABEL_COLORS = [
  "text-muted-foreground",
  "text-destructive",
  "text-amber-500",
  "text-yellow-400",
  "text-emerald-500",
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, checks } = evaluatePassword(password);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= score ? BAR_COLORS[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      {password && (
        <p className={cn("text-xs font-medium", LABEL_COLORS[score])}>{label}</p>
      )}
      <ul className="space-y-1 mt-2">
        {PASSWORD_REQUIREMENTS.map((r) => {
          const ok = checks[r.key];
          return (
            <li
              key={r.key}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                ok ? "text-emerald-500" : "text-muted-foreground",
              )}
            >
              {ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}