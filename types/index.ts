export type PlanLevel = 0 | 1 | 2;

export interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  level: PlanLevel;
  className?: string;
  textColor?: string;
  priceColor?: string;
  labelColor?: string;
  recommended?: boolean;
  dark?: boolean;
}

export interface PlanDetail {
  id: string;
  price: string;
  features: string[];
  nextBilling: string;
}

export interface CountryData {
  states: Record<string, string[]>;
  zipLabel: string;
  zipPlaceholder: string;
}

export interface PaymentDetails {
  last4: string;
  brand: string;
  expiry: string;
}

export interface BillingDetails {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}
