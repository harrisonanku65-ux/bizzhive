import { Check, X } from "lucide-react";
import type { PasswordCheck } from "@/lib/password";

/**
 * Live requirement checklist and strength meter.
 *
 * Shows every rule up front rather than revealing them one failure at a time,
 * so people can compose a valid password in one pass instead of guessing.
 */
export function PasswordStrength({
  check,
  show,
}: {
  check: PasswordCheck;
  /** Usually "has the user typed anything yet" — keeps the form calm initially. */
  show: boolean;
}) {
  if (!show) return null;

  const barColour =
    check.score <= 1
      ? "bg-destructive"
      : check.score === 2
        ? "bg-amber-500"
        : check.score === 3
          ? "bg-lime-500"
          : "bg-green-600";

  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium">Password strength</span>
          <span
            className={
              check.score <= 1
                ? "text-xs text-destructive font-medium"
                : check.score === 2
                  ? "text-xs text-amber-600 font-medium"
                  : "text-xs text-green-700 font-medium"
            }
          >
            {check.strengthLabel}
          </span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < check.score ? barColour : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      <ul className="space-y-1">
        {check.rules.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-xs ${
              rule.passed ? "text-green-700" : "text-muted-foreground"
            }`}
          >
            {rule.passed ? (
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
