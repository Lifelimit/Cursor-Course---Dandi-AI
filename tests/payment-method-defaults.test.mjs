import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("payment method mutations require an explicit default choice", async () => {
  const [saveRoute, subscribeRoute, form] = await Promise.all([
    read("app/api/stripe/save-payment-method/route.ts"),
    read("app/api/stripe/subscribe/route.ts"),
    read("components/dashboard/subscription/PaymentForm.tsx"),
  ]);

  assert.match(saveRoute, /validateOptionalBoolean\(body\.makeDefault, "makeDefault"\)/);
  assert.match(saveRoute, /if \(makeDefault\) \{[\s\S]*persistDefaultPaymentMethod/);
  assert.match(saveRoute, /isDefault: currentDefaultPaymentMethodId === paymentMethodId/);
  assert.match(subscribeRoute, /validateOptionalBoolean\(body\.makeDefault, "makeDefault"\)/);
  assert.match(subscribeRoute, /if \(makeDefault\) \{[\s\S]*persistDefaultPaymentMethod/);
  assert.match(subscribeRoute, /default_payment_method: paymentMethodId/);
  assert.match(form, /Make this my default payment method/);
  assert.match(form, /saved as a secondary method/);
});

test("payment display and deletion never promote a fallback method", async () => {
  const [displayService, deleteRoute, billingClient, webhookRoute] = await Promise.all([
    read("lib/services/usage-billing.service.ts"),
    read("app/api/stripe/delete-payment/route.ts"),
    read("app/billing/BillingClient.tsx"),
    read("app/api/webhooks/stripe/route.ts"),
  ]);

  assert.doesNotMatch(displayService, /idx === 0/);
  assert.match(displayService, /isDefault: Boolean\(defaultMethodId && pm\.id === defaultMethodId\)/);
  assert.match(deleteRoute, /clearPaymentMethodReferences\(customerId, paymentMethodId\)/);
  assert.match(deleteRoute, /status: 409/);
  assert.doesNotMatch(deleteRoute, /remainingMethods/);
  assert.doesNotMatch(deleteRoute, /persistDefaultPaymentMethod/);
  assert.match(billingClient, /No default payment method/);
  assert.match(webhookRoute, /const shouldMakeDefault = !existingDefaultPaymentMethodId/);
  assert.doesNotMatch(webhookRoute, /existingMethods\.data\[0\]/);
});

test("subscription profile payment metadata is customer-default scoped", async () => {
  const flow = await read("lib/services/stripe-billing-flow.service.ts");

  assert.match(flow, /if \(input\.paymentMethodDetails !== undefined\)/);
  assert.match(flow, /payment_method_last4 = input\.paymentMethodDetails\?\.last4 \?\? null/);
  assert.match(flow, /payment_method_brand = input\.paymentMethodDetails\?\.brand \?\? null/);
  assert.match(flow, /payment_method_expiry = input\.paymentMethodDetails\?\.expiry \?\? null/);
});
