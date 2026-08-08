export interface PasswordRules {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  ambiguous: "1lI0O"
};

export function getCharsetSize(rules: PasswordRules): number {
  let charset = "";
  if (rules.uppercase) charset += CHAR_SETS.uppercase;
  if (rules.lowercase) charset += CHAR_SETS.lowercase;
  if (rules.digits) charset += CHAR_SETS.digits;
  if (rules.symbols) charset += CHAR_SETS.symbols;

  if (rules.excludeAmbiguous) {
    charset = charset.split("").filter(c => !CHAR_SETS.ambiguous.includes(c)).join("");
  }
  
  return charset.length;
}

export function generatePassword(rules: PasswordRules): string {
  let charset = "";
  if (rules.uppercase) charset += CHAR_SETS.uppercase;
  if (rules.lowercase) charset += CHAR_SETS.lowercase;
  if (rules.digits) charset += CHAR_SETS.digits;
  if (rules.symbols) charset += CHAR_SETS.symbols;

  if (rules.excludeAmbiguous) {
    charset = charset.split("").filter(c => !CHAR_SETS.ambiguous.includes(c)).join("");
  }

  if (charset.length === 0) {
    throw new Error("Character set cannot be empty");
  }

  const N = charset.length;
  // Largest multiple of N less than or equal to 256
  const maxValid = 256 - (256 % N);

  let password = "";
  const randomBuffer = new Uint8Array(1);

  while (password.length < rules.length) {
    window.crypto.getRandomValues(randomBuffer);
    const byte = randomBuffer[0];
    
    // Rejection sampling to avoid modulo bias
    if (byte < maxValid) {
      password += charset[byte % N];
    }
  }

  return password;
}
