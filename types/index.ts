export type PlanLevel = 0 | 1 | 2;

export interface Plan {
  id: string;
  name: string;
  price: string;
  yearlyPrice?: string;
  features: string[];
  level: PlanLevel;
  className?: string;
  textColor?: string;
  priceColor?: string;
  labelColor?: string;
  recommended?: boolean;
  dark?: boolean;
  credits?: string;
  cta?: string;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
}

export interface PlanDetail {
  id: string;
  price: string;
  yearlyPrice?: string;
  features: string[];
  nextBilling: string;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
  /** Numeric monthly request limit; null = unlimited */
  monthlyLimit: number | null;
  /** Number of active API keys allowed; null = unlimited */
  keyLimit: number | null;
  /** Maximum limit that can be requested for a single API key */
  maxKeyLimitCap: number;
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
