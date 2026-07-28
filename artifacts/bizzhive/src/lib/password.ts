/**
 * Password policy — shared by the signup form and mirrored server-side in
 * `api-server/src/routes/auth.ts`.
 *
 * Client-side checks are a usability feature, never a security control: they
 * tell the user what's wrong before they submit. The server enforces the same
 * rules independently, because anything in the browser can be bypassed.
 *
 * Keep the two in sync if you change this.
 */

export const PASSWORD_MIN_LENGTH = 8;

/** Passwords so common they're tried first in any credential-stuffing attack. */
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "11111111",
  "abc12345",
  "iloveyou",
  "welcome1",
  "admin123",
  "letmein1",
  "football",
  "monkey123",
  "sunshine",
  "princess",
  "ghana123",
  "bizzhive",
]);

export interface PasswordRule {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordCheck {
  rules: PasswordRule[];
  /** True only when every rule passes. */
  valid: boolean;
  /** 0-4, for the strength meter. */
  score: number;
  strengthLabel: "Too weak" | "Weak" | "Fair" | "Strong" | "Very strong";
  /** First blocking problem, suitable for showing as an error. */
  error: string | null;
}

/**
 * @param password  the candidate
 * @param context   email / names, so we can reject passwords built from them
 */
export function checkPassword(
  password: string,
  context: { email?: string; firstName?: string; lastName?: string } = {},
): PasswordCheck {
  const lower = password.toLowerCase();

  // Reject anything containing a meaningful chunk of the user's own identity —
  // "kwame2024!" passes every character rule but is trivially guessable.
  const personalParts = [
    context.email?.split("@")[0],
    context.firstName,
    context.lastName,
  ]
    .filter((p): p is string => !!p && p.length >= 3)
    .map((p) => p.toLowerCase());

  const containsPersonal = personalParts.some((part) => lower.includes(part));
  const isCommon = COMMON_PASSWORDS.has(lower);

  const rules: PasswordRule[] = [
    {
      id: "length",
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      passed: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "upper",
      label: "One uppercase letter (A–Z)",
      passed: /[A-Z]/.test(password),
    },
    {
      id: "lower",
      label: "One lowercase letter (a–z)",
      passed: /[a-z]/.test(password),
    },
    {
      id: "number",
      label: "One number (0–9)",
      passed: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "One symbol (! @ # $ …)",
      passed: /[^A-Za-z0-9]/.test(password),
    },
    {
      id: "notCommon",
      label: "Not a commonly used password",
      passed: password.length > 0 && !isCommon && !containsPersonal,
    },
  ];

  const valid = rules.every((r) => r.passed);

  // Score rewards length beyond the minimum as well as variety, so a long
  // passphrase isn't rated below a short cryptic string.
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  const variety = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  if (variety >= 3) score += 1;
  if (variety === 4) score += 1;
  if (isCommon || containsPersonal) score = 0;
  if (password.length === 0) score = 0;

  const strengthLabel = (
    ["Too weak", "Weak", "Fair", "Strong", "Very strong"] as const
  )[Math.min(score, 4)];

  let error: string | null = null;
  if (password.length > 0) {
    if (isCommon) {
      error = "That password is too common. Please choose something less predictable.";
    } else if (containsPersonal) {
      error = "Your password shouldn't contain your name or email.";
    } else {
      const firstFailure = rules.find((r) => !r.passed);
      error = firstFailure ? `Password needs: ${firstFailure.label.toLowerCase()}.` : null;
    }
  }

  return { rules, valid, score, strengthLabel, error };
}
