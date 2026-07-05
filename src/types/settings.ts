import type { CryptoPaymentAsset, CryptoPaymentNetwork, PlanId } from "./billing";

export type ThemeMode = "system" | "light" | "dark";
export type AutoMoveMode = "off" | "confirm" | "automatic";
export type ReviewFrequency = "daily" | "every_3_days" | "weekly" | "monthly";

export interface PersonalSettings {
  language:
    | "en"
    | "zh-CN"
    | "zh-TW"
    | "es"
    | "fr"
    | "de"
    | "ja"
    | "ko"
    | "pt"
    | "ar";
  theme: ThemeMode;
  reviewFrequency: ReviewFrequency;
  dailyReviewTime: string;
  autoMoveMode: AutoMoveMode;
}

export interface AiModelSettings {
  provider: "default-free" | "openai-compatible" | "custom";
  modelName: string;
  monthlyCallLimit: number;
  useUserApiKey: boolean;
}

export interface TagRuleSettings {
  defaultTags: string[];
  protectedSystemTags: string[];
  allowAiCreateTags: boolean;
  allowMergeTags: boolean;
}

export interface InvalidLinkSettings {
  enabled: boolean;
  systemTag: "失效";
  confirmBeforeDelete: boolean;
  batchDeleteEnabled: boolean;
}

export interface BillingSettings {
  plans: Record<PlanId, { enabled: boolean; priceUsd: number }>;
  network: CryptoPaymentNetwork;
  assets: CryptoPaymentAsset[];
  confirmationBlocks: number;
}

export interface DefineAllSettings {
  personal: PersonalSettings;
  aiModel: AiModelSettings;
  tagRules: TagRuleSettings;
  invalidLinks: InvalidLinkSettings;
  billing: BillingSettings;
}

export const DEFAULT_DEFINE_ALL_SETTINGS: DefineAllSettings = {
  personal: {
    language: "en",
    theme: "dark",
    reviewFrequency: "daily",
    dailyReviewTime: "09:00",
    autoMoveMode: "confirm",
  },
  aiModel: {
    provider: "default-free",
    modelName: "free-mainstream-model",
    monthlyCallLimit: 300,
    useUserApiKey: false,
  },
  tagRules: {
    defaultTags: ["ai", "research", "tools"],
    protectedSystemTags: ["失效"],
    allowAiCreateTags: true,
    allowMergeTags: true,
  },
  invalidLinks: {
    enabled: true,
    systemTag: "失效",
    confirmBeforeDelete: true,
    batchDeleteEnabled: true,
  },
  billing: {
    plans: {
      free: { enabled: true, priceUsd: 0 },
      monthly: { enabled: true, priceUsd: 5 },
      lifetime: { enabled: true, priceUsd: 120 },
    },
    network: "polygon",
    assets: ["USDT", "USDC"],
    confirmationBlocks: 20,
  },
};
