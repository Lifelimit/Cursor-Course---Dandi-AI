import { Plan, PlanDetail, CountryData } from "@/types";
import { publicEnv } from "@/lib/env";

export const PLAN_DETAILS: Record<string, PlanDetail> = {
  Hobby: {
    id: "Hobby",
    price: "$0",
    features: ["1,000 requests / mo", "3 Active API Keys", "Standard Summaries", "Basic Analytics"],
    nextBilling: "N/A",
    monthlyLimit: 1000,
    keyLimit: 3,
  },
  Premium: {
    id: "Premium",
    price: "$20",
    features: ["5,000 requests / mo", "10 Active API Keys", "Advanced AI Context", "Priority Support"],
    nextBilling: "May 24, 2026",
    monthlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    yearlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
    monthlyLimit: 5000,
    keyLimit: 10,
  },
  Researcher: {
    id: "Researcher",
    price: "$99",
    features: ["Unlimited requests / mo", "Unlimited API Keys", "Custom Branding", "Priority Support"],
    nextBilling: "May 24, 2026",
    monthlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID,
    yearlyPriceId: publicEnv.NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID,
    monthlyLimit: null,
    keyLimit: null,
  }
};

export const PLAN_RANKS: Record<string, number> = { Hobby: 0, Premium: 1, Researcher: 2 };

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
    name: "The Hobbyist",
    price: "$0",
    credits: "1,000 requests / mo",
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
    name: "The Premium",
    price: "$20",
    yearlyPrice: "$16",
    credits: "5,000 requests / mo",
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
    name: "The Researcher",
    price: "$99",
    yearlyPrice: "$79",
    credits: "Unlimited requests / mo",
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

/**
 * Resolves a user's plan name to its canonical name and settings.
 * Unknown, empty, or null plan names consistently resolve to "Hobby".
 */
export function resolvePlan(planName?: string | null) {
  const name = (planName && PLAN_DETAILS[planName]) ? planName : "Hobby";
  const details = PLAN_DETAILS[name];
  return {
    name,
    details,
    maxKeys: details.keyLimit,
    monthlyRequests: details.monthlyLimit,
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
  };
}
