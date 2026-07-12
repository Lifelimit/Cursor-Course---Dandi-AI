import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export class StripePaymentMethodAccessError extends Error {
  constructor() {
    super("Payment method is invalid or unavailable.");
    this.name = "StripePaymentMethodAccessError";
  }
}

function getPaymentMethodCustomerId(paymentMethod: Stripe.PaymentMethod) {
  const customer = paymentMethod.customer;
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export async function getOwnedPaymentMethod(
  paymentMethodId: string,
  customerId: string,
) {
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  const existingCustomerId = getPaymentMethodCustomerId(paymentMethod);

  if (existingCustomerId !== customerId) {
    throw new StripePaymentMethodAccessError();
  }

  return paymentMethod;
}
