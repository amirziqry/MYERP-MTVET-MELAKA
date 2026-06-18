export type PasswordChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
};

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Empty" | "Weak" | "Medium" | "Strong" | "Very Strong";
  checks: PasswordChecks;
};

export function evaluatePassword(password: string): PasswordStrength {
  const checks: PasswordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  if (!password) {
    return { score: 0, label: "Empty", checks };
  }

  const passed = Object.values(checks).filter(Boolean).length;
  let score: 0 | 1 | 2 | 3 | 4 = 1;
  if (passed >= 5 && password.length >= 12) score = 4;
  else if (passed >= 5) score = 3;
  else if (passed >= 3) score = 2;
  else score = 1;

  const labels = ["Empty", "Weak", "Medium", "Strong", "Very Strong"] as const;
  return { score, label: labels[score], checks };
}

export const PASSWORD_REQUIREMENTS: { key: keyof PasswordChecks; label: string }[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "upper", label: "At least one uppercase letter" },
  { key: "lower", label: "At least one lowercase letter" },
  { key: "number", label: "At least one number" },
  { key: "symbol", label: "At least one symbol" },
];