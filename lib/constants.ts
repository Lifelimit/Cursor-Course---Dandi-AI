import { Plan, PlanDetail, CountryData } from "@/types";
import { publicEnv } from "@/lib/env";

export const PLAN_DETAILS: Record<string, PlanDetail> = {
  Hobby: {
    id: "Hobby",
    price: "$0",
    features: ["1,000 monthly requests", "3 Active API Keys", "Standard Summaries", "Basic Analytics"],
    nextBilling: "Not available",
    monthlyLimit: 1000,
    keyLimit: 3,
    maxKeyLimitCap: 1000,
  },
  Premium: {
    id: "Premium",
    price: "$10",
    features: ["5,000 monthly requests", "10 Active API Keys", "Advanced AI Context", "Priority Support"],
    nextBilling: "Not available",
    monthlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    yearlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
    monthlyLimit: 5000,
    keyLimit: 10,
    maxKeyLimitCap: 5000,
  },
  Researcher: {
    id: "Researcher",
    price: "$50",
    features: ["Unlimited monthly requests", "Unlimited API Keys", "Custom Branding", "Priority Support"],
    nextBilling: "Not available",
    monthlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID,
    yearlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID,
    monthlyLimit: null,
    keyLimit: null,
    maxKeyLimitCap: 100000,
  }
};

export const PLAN_RANKS: Record<string, number> = { Hobby: 0, Premium: 1, Researcher: 2 };

export const ANNUAL_SAVINGS_PERCENT = 20;

export function getPlanAnnualTotal(plan: Pick<Plan, "yearlyPrice">) {
  if (!plan.yearlyPrice) return null;
  const monthlyAmount = Number.parseFloat(plan.yearlyPrice.replace(/[^0-9.]/g, ""));
  return Number.isFinite(monthlyAmount) ? `$${monthlyAmount * 12}` : null;
}

export const LOCATION_DATA: Record<string, CountryData> = {
  "United States": {
    states: {
      "California": ["Los Angeles", "San Diego", "San Jose", "San Francisco"],
      "New York": ["New York City", "Buffalo", "Rochester"],
      "Texas": ["Houston", "San Antonio", "Dallas", "Austin"]
    },
    zipLabel: "Zip Code",
    zipPlaceholder: "12345"
  },
  "United Kingdom": {
    states: {
      "England": ["London", "Birmingham", "Manchester", "Liverpool", "Leeds", "Sheffield", "Bristol", "Leicester"],
      "Scotland": ["Glasgow", "Edinburgh"]
    },
    zipLabel: "Postcode",
    zipPlaceholder: "SW1A 1AA"
  },
  "Canada": {
    states: {
      "Ontario": ["Toronto", "Ottawa", "Hamilton", "Kitchener"],
      "Quebec": ["Montreal", "Quebec City"],
      "British Columbia": ["Vancouver", "Victoria"],
      "Alberta": ["Calgary", "Edmonton"]
    },
    zipLabel: "Postal Code",
    zipPlaceholder: "A1B 2C3"
  },
  "Germany": {
    states: {
      "Bavaria": ["Munich", "Nuremberg", "Augsburg"],
      "Berlin": ["Berlin"],
      "Hamburg": ["Hamburg"],
      "Hesse": ["Frankfurt", "Wiesbaden"],
      "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund"]
    },
    zipLabel: "Postleitzahl",
    zipPlaceholder: "10115"
  },
  "Australia": {
    states: {
      "NSW": ["Sydney", "Newcastle", "Wollongong"],
      "Victoria": ["Melbourne", "Geelong"],
      "Queensland": ["Brisbane", "Gold Coast", "Sunshine Coast"],
      "Western Australia": ["Perth"],
      "South Australia": ["Adelaide"]
    },
    zipLabel: "Postcode",
    zipPlaceholder: "2000"
  }
};

export const COUNTRIES = Object.keys(LOCATION_DATA);

export const PLANS: Plan[] = [
  {
    id: "Hobby",
    name: "Hobby",
    price: "$0",
    credits: "1,000 monthly requests",
    features: [
      "Standard Summaries",
      "Basic Analytics",
      "3 Active API Keys",
      "Community Support",
    ],
    cta: "Downgrade",
    level: 0,
    className: "border-zinc-200 bg-white",
    textColor: "text-zinc-600",
    priceColor: "text-zinc-900",
    labelColor: "text-zinc-400",
  },
  {
    id: "Premium",
    name: "Premium",
    price: "$10",
    yearlyPrice: "$8",
    credits: "5,000 monthly requests",
    features: [
      "Advanced AI Context",
      "Detailed Analytics",
      "10 Active Keys",
      "Priority Email Support",
      "CSV Data Export",
    ],
    cta: "Switch to Premium",
    level: 1,
    recommended: true,
    className: "border-2 border-zinc-900 bg-white shadow-2xl",
    textColor: "text-zinc-600",
    priceColor: "text-zinc-900",
    labelColor: "text-zinc-400",
    monthlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    yearlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
  },
  {
    id: "Researcher",
    name: "Researcher",
    price: "$50",
    yearlyPrice: "$40",
    credits: "Unlimited monthly requests",
    features: [
      "Deep Insight Engine",
      "Global Top Trends",
      "Unlimited Keys",
      "24/7 Phone Support",
      "Custom Alert Rules",
    ],
    cta: "Go Researcher",
    level: 2,
    dark: true,
    className: "border-zinc-200 bg-[#18181b] text-white",
    textColor: "text-zinc-400",
    priceColor: "text-white",
    labelColor: "text-zinc-500",
    monthlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID,
    yearlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID,
  }
];

export function resolvePlan(planName?: string | null) {
  const name = (planName && PLAN_DETAILS[planName]) ? planName : "Hobby";
  const details = PLAN_DETAILS[name];
  return {
    name,
    details,
    maxKeys: details.keyLimit,
    monthlyRequests: details.monthlyLimit,
    maxLimitCap: details.maxKeyLimitCap,
  };
}

/**
 * Derives display-ready plan limits from PLAN_DETAILS.
 * Handles the Researcher "unlimited" case by returning a 1M sentinel
 * for progress bar rendering, plus an explicit `isUnlimited` flag.
 */
export function getPlanLimits(planName?: string | null) {
  const resolved = resolvePlan(planName);
  const isUnlimited = resolved.monthlyRequests === null;
  return {
    planName: resolved.name,
    monthlyLimit: isUnlimited ? 1_000_000 : resolved.monthlyRequests!,
    keyLimit: resolved.maxKeys,
    isUnlimited,
    maxLimitCap: resolved.maxLimitCap,
  };
}
