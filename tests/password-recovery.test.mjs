import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared auth validation normalizes emails and enforces the signup password policy", async () => {
  const source = await read("lib/auth-validation.ts");
  assert.match(source, /AUTH_PASSWORD_MIN_LENGTH = 12/);
  assert.match(source, /value\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /email\.length <= 254/);
  assert.match(source, /password\.length < AUTH_PASSWORD_MIN_LENGTH/);
});

test("password recovery uses the browser Supabase boundary and a trusted callback", async () => {
  const [forgot, reset, callback, complete, login] = await Promise.all([
    read("components/auth/ForgotPasswordForm.tsx"),
    read("components/auth/ResetPasswordForm.tsx"),
    read("app/auth/callback/route.ts"),
    read("app/auth/recovery/complete/route.ts"),
    read("components/auth/AuthForm.tsx"),
  ]);

  assert.match(forgot, /resetPasswordForEmail\(normalizedEmail/);
  assert.match(forgot, /getAuthCallbackUrl\(PASSWORD_RESET_ROUTE, \{ flow: "recovery", returnTo: safeNext \}\)/);
  assert.match(forgot, /If an eligible account exists/);
  assert.match(forgot, /disabled=\{isLoading\}/);
  assert.match(reset, /PASSWORD_RECOVERY/);
  assert.match(reset, /getSession\(\)/);
  assert.match(reset, /getPasswordValidationError\(password, confirmPassword\)/);
  assert.match(reset, /updateUser\(\{ password \}\)/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /verifyOtp\(\{ token_hash: tokenHash, type: "recovery" \}\)/);
  assert.match(callback, /RECOVERY_COOKIE_NAME/);
  assert.match(complete, /maxAge: 0/);
  assert.match(login, /Forgot password\?/);
});

test("password recovery documentation names exact local and production destinations", async () => {
  const docs = await read("docs/AUTH_PASSWORD_RECOVERY.md");
  assert.match(docs, /http:\/\/localhost:3000\/auth\/callback/);
  assert.match(docs, /https:\/\/dandi-orcin\.vercel\.app\/auth\/reset-password/);
  assert.match(docs, /do not add a broad `\*\.vercel\.app` wildcard/i);
  assert.match(docs, /\{\{ \.ConfirmationURL \}\}/);
});
