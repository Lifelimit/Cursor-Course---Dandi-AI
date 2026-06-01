import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

function getPaymentMethodCustomerId(paymentMethod: Stripe.PaymentMethod) {
  const customer = paymentMethod.customer;
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export async function getOwnedPaymentMethod(
  paymentMethodId: string,
  customerId: string,
  options: { allowUnattached?: boolean } = {}
) {
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  const existingCustomerId = getPaymentMethodCustomerId(paymentMethod);

  if (existingCustomerId && existingCustomerId !== customerId) {
    throw new Error("Payment method does not belong to this customer.");
  }

  if (!options.allowUnattached && existingCustomerId !== customerId) {
    throw new Error("Payment method does not belong to this customer.");
  }

  return paymentMethod;
}
