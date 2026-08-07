import { PasswordRules, getCharsetSize } from "./password-gen";

export type Strength = "Weak" | "Fair" | "Strong" | "Excellent";

export function calculateEntropy(rules: PasswordRules): number {
  const n = getCharsetSize(rules);
  if (n === 0) return 0;
  return rules.length * Math.log2(n);
}

export function getStrengthLabel(entropy: number): Strength {
  if (entropy < 50) return "Weak";
  if (entropy < 70) return "Fair";
  if (entropy < 90) return "Strong";
  return "Excellent";
}
