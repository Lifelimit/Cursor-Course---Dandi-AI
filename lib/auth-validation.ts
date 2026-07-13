export const AUTH_PASSWORD_MIN_LENGTH = 12;

const AUTH_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidAuthEmail(value: string) {
  const email = normalizeAuthEmail(value);
  return email.length <= 254 && AUTH_EMAIL_PATTERN.test(email);
}

export type PasswordValidationError = "weak-password" | "password-mismatch";

export function getPasswordValidationError(
  password: string,
  confirmation?: string,
): PasswordValidationError | null {
  if (password.length < AUTH_PASSWORD_MIN_LENGTH) return "weak-password";
  if (confirmation !== undefined && password !== confirmation) return "password-mismatch";
  return null;
}
