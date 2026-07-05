export type PlanId = "free" | "monthly" | "lifetime";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceUsd: number;
  bookmarkLimit: number | "unlimited";
  billingPeriodDays?: number;
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    bookmarkLimit: 20,
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    priceUsd: 5,
    bookmarkLimit: "unlimited",
    billingPeriodDays: 30,
  },
  lifetime: {
    id: "lifetime",
    name: "Lifetime",
    priceUsd: 120,
    bookmarkLimit: "unlimited",
  },
};

export type CryptoPaymentNetwork = "polygon";
export type CryptoPaymentAsset = "USDT" | "USDC";

export interface CryptoPaymentOrder {
  id: string;
  userId: string;
  planId: PlanId;
  network: CryptoPaymentNetwork;
  asset: CryptoPaymentAsset;
  amountUsd: number;
  receivingAddress: string;
  status: "pending" | "confirmed" | "expired" | "manual_review";
  createdAt: string;
  confirmedAt?: string;
  transactionHash?: string;
}
