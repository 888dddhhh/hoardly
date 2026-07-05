import type { BookmarkMetadata } from "../types/bookmark";
import {
  AI_USER_SETTINGS_STORAGE_KEY,
  chatCompletionsUrlFromBase,
  DEFAULT_OPENROUTER_MODEL,
  loadAiUserSettings,
  normalizeAiUserSettings,
  type AiUserSettings,
  type AiUserProvider,
} from "./ai-user-settings";

export type AiProvider = AiUserProvider;

type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export type AiSearchRequest = {
  query: string;
  bookmarks: BookmarkMetadata[];
};

export type AiSearchResult = {
  answer: string;
  provider: AiProvider;
  model: string;
};

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export type ChatCompletionResult = {
  content: string;
  provider: AiProvider;
  model: string;
};

export async function completeChatCompletion(
  messages: ChatCompletionMessage[],
  options?: { jsonMode?: boolean; temperature?: number },
): Promise<ChatCompletionResult> {
  const temperature = options?.temperature ?? 0.2;
  const config = await resolveAiRuntimeConfig();
  return completeChatCompletionWithConfig(messages, { ...options, temperature }, config);
}

export async function testAiConnectionWithSettings(
  settings: AiUserSettings,
): Promise<ChatCompletionResult> {
  const normalized = normalizeAiUserSettings({
    ...settings,
    useCustomApi: true,
  });
  if (!normalized.apiKey.trim()) {
    throw new Error("请先填写 API Key，再测试连接。");
  }
  if (!normalized.model.trim()) {
    throw new Error("请先填写模型 ID，再测试连接。");
  }
  if (!/^https?:\/\//i.test(normalized.baseUrl.trim())) {
    throw new Error("Base URL 必须以 http:// 或 https:// 开头。");
  }
  const config = await resolveAiRuntimeConfig(normalized);
  const messages: ChatCompletionMessage[] = [
    {
      role: "system",
      content: "你是 Hoardly 的 AI 连接测试。请只用中文短句回答，不要输出 Markdown。",
    },
    {
      role: "user",
      content: "请回复：连接成功，并说明你收到的模型名称。",
    },
  ];

  return completeChatCompletionWithConfig(messages, { temperature: 0 }, config);
}

async function completeChatCompletionWithConfig(
  messages: ChatCompletionMessage[],
  options: { jsonMode?: boolean; temperature?: number } | undefined,
  config: ResolvedAiConfig,
): Promise<ChatCompletionResult> {
  const temperature = options?.temperature ?? 0.2;

  if (!config.apiKey && !config.usesLocalProxy) {
    throw new Error(
      `缺少 API Key（请在设置「AI 个性化」填写，或配置 ${getApiKeyName(config.provider)}）。`,
    );
  }

  const headers: Record<string, string> = {
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    "Content-Type": "application/json",
  };

  if (config.provider === "openrouter" && config.isDirect) {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://127.0.0.1:5173";
    headers["HTTP-Referer"] = origin;
    headers["X-Title"] = "Hoardly";
  }

  const requestBody = {
    model: config.model,
    messages,
    temperature,
    ...(options?.jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  let response = await fetch(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok && options?.jsonMode) {
    const message = await response.text();
    if (!/response_format|json_object|json mode/i.test(message)) {
      throw new Error(`AI 请求失败：${response.status} ${message}`);
    }
    response = await fetch(config.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
      }),
    });
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`AI 请求失败：${response.status} ${message}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("AI 没有返回有效内容。");

  return { content, provider: config.provider, model: config.model };
}

export async function runBookmarkAiSearch({
  query,
  bookmarks,
}: AiSearchRequest): Promise<AiSearchResult> {
  const config = await resolveAiRuntimeConfig();

  if (isModelIdentityQuery(query)) {
    return {
      answer: `我是 Hoardly 内置的 AI 助手，当前通过 ${config.provider} 调用模型：${config.model}。`,
      provider: config.provider,
      model: config.model,
    };
  }

  const messages = buildMessages(query, bookmarks, config.provider, config.model);
  const { content, provider, model } = await completeChatCompletion(messages, {
    temperature: 0.2,
  });
  return { answer: content, provider, model };
}

type ResolvedAiConfig = {
  provider: AiProvider;
  model: string;
  apiKey: string | undefined;
  endpoint: string;
  usesLocalProxy: boolean;
  isDirect: boolean;
};

async function resolveAiRuntimeConfig(
  settingsOverride?: AiUserSettings,
): Promise<ResolvedAiConfig> {
  const user = settingsOverride ?? (await loadAiRuntimeUserSettings());
  const useCustom = user.useCustomApi && user.apiKey.trim().length > 0;

  if (useCustom) {
    const provider = user.provider;
    const base = user.baseUrl.trim() || defaultBaseForProvider(provider);
    const endpoint = resolveEndpointFromBase(base);
    return {
      provider,
      model: user.model.trim() || getDefaultModelForProvider(provider),
      apiKey: user.apiKey.trim(),
      endpoint,
      usesLocalProxy: false,
      isDirect: true,
    };
  }

  const provider = getEnvProvider();
  const model = getEnvModel(provider);
  const apiKey = getEnvApiKey(provider);
  const endpoint = getEnvEndpoint(provider);
  const usesLocalProxy = endpoint.startsWith("/");

  return {
    provider,
    model,
    apiKey: apiKey || undefined,
    endpoint: shouldAvoidLocalProxy() && usesLocalProxy ? directEndpointForProvider(provider) : endpoint,
    usesLocalProxy: shouldAvoidLocalProxy() ? false : usesLocalProxy,
    isDirect: shouldAvoidLocalProxy() ? true : !usesLocalProxy,
  };
}

async function loadAiRuntimeUserSettings() {
  if (typeof window !== "undefined") {
    return loadAiUserSettings();
  }

  const chromeStorage = (globalThis as typeof globalThis & {
    chrome?: { storage?: { local?: { get?: (keys: string | string[]) => Promise<Record<string, unknown>> } } };
  }).chrome?.storage?.local;

  try {
    const stored = await chromeStorage?.get?.(AI_USER_SETTINGS_STORAGE_KEY);
    const parsed = stored?.[AI_USER_SETTINGS_STORAGE_KEY] as Partial<import("./ai-user-settings").AiUserSettings> | undefined;
    return normalizeAiUserSettings(parsed);
  } catch {
    return normalizeAiUserSettings(undefined);
  }
}

function shouldAvoidLocalProxy() {
  return typeof window === "undefined";
}

function resolveEndpointFromBase(base: string): string {
  const t = base.trim();
  if (/\/chat\/completions$/i.test(t)) return t.replace(/\/$/, "");
  return chatCompletionsUrlFromBase(t);
}

function defaultBaseForProvider(provider: AiProvider): string {
  if (provider === "groq") return "https://api.groq.com/openai/v1";
  if (provider === "openrouter") return "https://openrouter.ai/api/v1";
  if (provider === "deepseek") return "https://api.deepseek.com";
  return "https://api.openai.com/v1";
}

function getDefaultModelForProvider(provider: AiProvider): string {
  if (provider === "groq") return "llama-3.1-8b-instant";
  if (provider === "openrouter") return DEFAULT_OPENROUTER_MODEL;
  if (provider === "deepseek") return "deepseek-chat";
  return "gpt-4o-mini";
}

function getEnvProvider(): AiProvider {
  const provider = env.VITE_HOARDLY_AI_PROVIDER;
  if (provider === "groq" || provider === "deepseek" || provider === "openai") {
    return provider;
  }
  return "openrouter";
}

function getEnvModel(provider: AiProvider) {
  if (env.VITE_HOARDLY_AI_MODEL) return env.VITE_HOARDLY_AI_MODEL;
  return getDefaultModelForProvider(provider);
}

function getEnvApiKey(provider: AiProvider) {
  if (provider === "groq") return env.VITE_GROQ_API_KEY;
  if (provider === "openrouter") return env.VITE_OPENROUTER_API_KEY;
  if (provider === "deepseek") return env.VITE_DEEPSEEK_API_KEY;
  return env.VITE_OPENAI_API_KEY;
}

function getEnvEndpoint(provider: AiProvider) {
  if (env.VITE_HOARDLY_AI_ENDPOINT) return env.VITE_HOARDLY_AI_ENDPOINT;
  if (env.VITE_HOARDLY_AI_USE_LOCAL_PROXY !== "false") return "/api/ai/chat";
  return directEndpointForProvider(provider);
}

function directEndpointForProvider(provider: AiProvider) {
  if (provider === "groq") return "https://api.groq.com/openai/v1/chat/completions";
  if (provider === "openrouter") return "https://openrouter.ai/api/v1/chat/completions";
  if (provider === "deepseek") return "https://api.deepseek.com/chat/completions";
  return "https://api.openai.com/v1/chat/completions";
}

function getApiKeyName(provider: AiProvider) {
  if (provider === "groq") return "VITE_GROQ_API_KEY";
  if (provider === "openrouter") return "VITE_OPENROUTER_API_KEY";
  if (provider === "deepseek") return "VITE_DEEPSEEK_API_KEY";
  return "VITE_OPENAI_API_KEY";
}

function buildMessages(
  query: string,
  bookmarks: BookmarkMetadata[],
  provider: AiProvider,
  model: string,
): ChatCompletionMessage[] {
  const systemPrompt = [
    "你是 Hoardly 内置的 AI 助手，主要帮助用户搜索、整理和归类浏览器书签。",
    `当前模型通过 ${provider} 调用，模型 ID 是 ${model}。`,
    "如果用户问你是谁、你是什么模型、你能做什么，请直接基于以上信息回答。",
    "如果用户的问题不是书签、Tag、文件夹、网页搜索或链接整理相关，请按普通 AI 助手正常回答，不要强行引用书签数据。",
    "回答使用中文，保持简洁、准确。",
  ].join("\n");

  if (!shouldUseBookmarkContext(query)) {
    return [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: query,
      },
    ];
  }

  const bookmarkContext = bookmarks.slice(0, 30).map((bookmark, index) => ({
    index: index + 1,
    title: bookmark.title,
    url: bookmark.url,
    description: bookmark.description,
    tags: bookmark.tags,
    folder: bookmark.folderSuggestion,
    status: bookmark.status,
  }));

  return [
    {
      role: "system",
      content:
        `${systemPrompt}\n当用户的问题涉及书签时，请基于提供的书签上下文回答，优先给出相关书签、Tag、文件夹和可执行整理建议。`,
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          query,
          bookmarks: bookmarkContext,
        },
        null,
        2,
      ),
    },
  ];
}

function shouldUseBookmarkContext(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;

  return /书签|链接|网页|网站|tag|标签|folder|文件夹|收藏|search|搜索|查找|找一下|整理|归类|分类|失效|无效|finance|research|ai|agents|charts/i.test(
    normalized,
  );
}

function isModelIdentityQuery(query: string) {
  return /你是什么模型|你用的什么模型|当前模型|model|which model|what model/i.test(
    query.trim(),
  );
}
