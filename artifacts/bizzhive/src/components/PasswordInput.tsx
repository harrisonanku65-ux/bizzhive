import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** Rendered above the field. */
  label?: string;
}

/**
 * Password field with a show/hide toggle.
 *
 * Typing a password blind is a common cause of failed logins and mistyped
 * signups, so the toggle is available everywhere a password is entered.
 * It defaults to hidden and reverts on every mount — it is never sticky.
 */
export function PasswordInput({
  label,
  className,
  id,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium mb-1.5 block">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          className={cn(
            "w-full bg-muted rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30",
            className,
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // Excluded from tab order so it never interrupts keyboard users
          // moving between fields; still reachable and announced by screen
          // readers via the label.
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
