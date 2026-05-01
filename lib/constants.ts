import { Plan, PlanDetail, CountryData } from "@/types";

export const PLAN_DETAILS: Record<string, PlanDetail> = {
  Hobby: {
    id: "Hobby",
    price: "$0",
    features: ["1,000 requests / mo", "3 Active API Keys"],
    nextBilling: "N/A",
  },
  Premium: {
    id: "Premium",
    price: "$20",
    features: ["5,000 requests / mo", "Unlimited Active Keys", "Priority Support"],
    nextBilling: "May 24, 2026",
  },
  Researcher: {
    id: "Researcher",
    price: "$99",
    features: ["Unlimited requests / mo", "Unlimited Active Keys", "Custom Branding", "Priority Support"],
    nextBilling: "May 24, 2026",
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
    features: [
      "1,000 requests / mo",
      "3 Active API Keys",
    ],
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
    features: [
      "5,000 requests / mo",
      "Unlimited Active Keys",
      "Priority Support",
    ],
    level: 1,
    recommended: true,
    className: "border-2 border-zinc-900 bg-white shadow-2xl",
    textColor: "text-zinc-600",
    priceColor: "text-zinc-900",
    labelColor: "text-zinc-400",
  },
  {
    id: "Researcher",
    name: "The Researcher",
    price: "$99",
    features: [
      "Unlimited requests / mo",
      "Unlimited Active Keys",
      "Custom Branding",
      "Priority Support",
    ],
    level: 2,
    dark: true,
    className: "border-zinc-200 bg-[#18181b] text-white",
    textColor: "text-zinc-400",
    priceColor: "text-white",
    labelColor: "text-zinc-500",
  }
];
