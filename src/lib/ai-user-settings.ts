export type AiUserProvider = "openrouter" | "groq" | "deepseek" | "openai";

export type AiUserSettings = {
  useCustomApi: boolean;
  provider: AiUserProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  jinaApiKey: string;
  firecrawlApiKey: string;
  firecrawlApiUrl: string;
  crawl4AiEndpoint: string;
};

export const AI_USER_SETTINGS_STORAGE_KEY = "hoardly:user-ai-settings";

export const DEFAULT_OPENROUTER_MODEL = "inclusionai/ling-2.6-flash";

export const OPENROUTER_MODEL_OPTIONS = [
  {
    label: "Ling-2.6 Flash",
    value: "inclusionai/ling-2.6-flash",
  },
  {
    label: "Ling-2.6 1T Free",
    value: "inclusionai/ling-2.6-1t:free",
  },
] as const;

const LEGACY_OPENROUTER_MODELS = new Map([
  ["inclusionai/ling-2.6-flash:free", "inclusionai/ling-2.6-flash"],
]);

const DEFAULTS: AiUserSettings = {
  useCustomApi: false,
  provider: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  model: DEFAULT_OPENROUTER_MODEL,
  apiKey: "",
  jinaApiKey: "",
  firecrawlApiKey: "",
  firecrawlApiUrl: "https://api.firecrawl.dev/v2/scrape",
  crawl4AiEndpoint: "",
};

export function loadAiUserSettings(): AiUserSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(AI_USER_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AiUserSettings>;
    return normalizeAiUserSettings(parsed);
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAiUserSettings(partial: Partial<AiUserSettings>): AiUserSettings {
  const next = normalizeAiUserSettings({ ...loadAiUserSettings(), ...partial });
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AI_USER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    const chromeStorage = (globalThis as typeof globalThis & {
      chrome?: { storage?: { local?: { set?: (items: Record<string, unknown>) => Promise<void> | void } } };
    }).chrome?.storage?.local;
    chromeStorage?.set?.({
      [AI_USER_SETTINGS_STORAGE_KEY]: next,
    });
  }
  return next;
}

export function normalizeAiUserSettings(
  parsed: Partial<AiUserSettings> | null | undefined,
): AiUserSettings {
  const provider = isProvider(parsed?.provider) ? parsed.provider : DEFAULTS.provider;
  const parsedModel = typeof parsed?.model === "string" ? parsed.model.trim() : "";
  const model =
    provider === "openrouter" && LEGACY_OPENROUTER_MODELS.has(parsedModel)
      ? LEGACY_OPENROUTER_MODELS.get(parsedModel) ?? DEFAULT_OPENROUTER_MODEL
      : parsedModel || DEFAULTS.model;

  return {
    ...DEFAULTS,
    ...parsed,
    useCustomApi: Boolean(parsed?.useCustomApi),
    provider,
    baseUrl: typeof parsed?.baseUrl === "string" ? parsed.baseUrl : DEFAULTS.baseUrl,
    model,
    apiKey: typeof parsed?.apiKey === "string" ? parsed.apiKey : "",
    jinaApiKey: typeof parsed?.jinaApiKey === "string" ? parsed.jinaApiKey : "",
    firecrawlApiKey:
      typeof parsed?.firecrawlApiKey === "string" ? parsed.firecrawlApiKey : "",
    firecrawlApiUrl:
      typeof parsed?.firecrawlApiUrl === "string"
        ? parsed.firecrawlApiUrl
        : DEFAULTS.firecrawlApiUrl,
    crawl4AiEndpoint:
      typeof parsed?.crawl4AiEndpoint === "string" ? parsed.crawl4AiEndpoint : "",
  };
}

function isProvider(value: unknown): value is AiUserProvider {
  return value === "openrouter" || value === "groq" || value === "deepseek" || value === "openai";
}

export function chatCompletionsUrlFromBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}
