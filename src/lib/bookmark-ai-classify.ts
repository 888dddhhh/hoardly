import { completeChatCompletion } from "./ai-client";
import type { BookmarkMetadata } from "../types/bookmark";
import { fetchDeepPageTextOptional, gatherExtendedTagEvidence } from "./bookmark-service";
import type { ExtendedTagEvidence } from "./bookmark-tag-evidence";
import { buildEvidenceDossierForAi } from "./bookmark-tag-evidence";
import { buildBrandSlugBlocklist, ensureExactlyThreeTags, isUsefulTag, slugTag } from "./bookmark-tags";
import {
  BOOKMARK_TAGGING_FEW_SHOTS,
  BOOKMARK_TAXONOMY,
  matchTaxonomyCandidates,
  summarizeTaxonomyForPrompt,
} from "./bookmark-taxonomy";
import {
  AI_USER_SETTINGS_STORAGE_KEY,
  loadAiUserSettings,
  normalizeAiUserSettings,
} from "./ai-user-settings";

type TagRow = { bookmarkId: string; tags?: string[] };
type TagBatchJson = { items?: TagRow[] };

type SiteServiceInferItem = {
  bookmarkId: string;
  siteKindZh?: string;
  serviceTagsEn?: string[];
};

type SiteServiceInferResponse = { items?: SiteServiceInferItem[] };

type DraftItem = {
  bookmarkId: string;
  tags?: string[];
  folderSuggestion?: string;
  description?: string;
};

type DraftResponse = { items?: DraftItem[] };

type StrictMethodResult = {
  engine: "jina-reader" | "firecrawl" | "crawl4ai";
  tags: string[];
  summary: string;
  categoryId?: string;
  confidence: number;
  evidence: string;
};

type StrictFinalResult = {
  tags?: string[];
  summary?: string;
  categoryId?: string;
  folderSuggestion?: string;
  confidence?: number;
  agreedEvidence?: string[];
};

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

type StrictTaggingConfig = {
  jinaApiKey: string;
  firecrawlApiKey: string;
  firecrawlApiUrl: string;
  crawl4AiEndpoint: string;
};

const STRICT_TAG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tags: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    summary: { type: "string" },
    categoryId: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["tags", "summary", "confidence"],
};

const FIRECRAWL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tags: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    summary: { type: "string" },
    categoryId: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["tags", "summary", "confidence"],
};

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("未在模型输出中找到 JSON 对象。");
  }
  try {
    return JSON.parse(body.slice(start, end + 1)) as unknown;
  } catch {
    throw new Error("模型输出的 JSON 无法解析。");
  }
}

function asStrictFinalResult(data: unknown): StrictFinalResult {
  const obj = data as StrictFinalResult;
  return {
    tags: Array.isArray(obj.tags) ? obj.tags.map((x) => String(x)) : undefined,
    summary: typeof obj.summary === "string" ? obj.summary : undefined,
    categoryId: typeof obj.categoryId === "string" ? obj.categoryId : undefined,
    folderSuggestion:
      typeof obj.folderSuggestion === "string" ? obj.folderSuggestion : undefined,
    confidence: typeof obj.confidence === "number" ? obj.confidence : undefined,
    agreedEvidence: Array.isArray(obj.agreedEvidence)
      ? obj.agreedEvidence.map((x) => String(x))
      : undefined,
  };
}

function sanitizeStrictTags(raw: string[] | undefined, brand: Set<string>) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of raw ?? []) {
    const tag = slugTag(String(item));
    if (!isUsefulTag(tag, brand) || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 3) break;
  }
  return tags;
}

function readerUrlFor(url: string) {
  return `https://r.jina.ai/${url.trim()}`;
}

async function resolveStrictTaggingConfig(): Promise<StrictTaggingConfig> {
  const user = await loadStrictTaggingUserSettings();
  return {
    jinaApiKey: user.jinaApiKey.trim() || env.VITE_JINA_API_KEY || env.JINA_API_KEY || "",
    firecrawlApiKey:
      user.firecrawlApiKey.trim() ||
      env.VITE_FIRECRAWL_API_KEY ||
      env.FIRECRAWL_API_KEY ||
      "",
    firecrawlApiUrl:
      user.firecrawlApiUrl.trim() ||
      env.VITE_FIRECRAWL_API_URL ||
      env.FIRECRAWL_API_URL ||
      "https://api.firecrawl.dev/v2/scrape",
    crawl4AiEndpoint:
      user.crawl4AiEndpoint.trim() ||
      env.VITE_CRAWL4AI_ENDPOINT ||
      env.CRAWL4AI_ENDPOINT ||
      "",
  };
}

async function loadStrictTaggingUserSettings() {
  if (typeof window !== "undefined") {
    return loadAiUserSettings();
  }

  const chromeStorage = (globalThis as typeof globalThis & {
    chrome?: { storage?: { local?: { get?: (keys: string | string[]) => Promise<Record<string, unknown>> } } };
  }).chrome?.storage?.local;

  try {
    const stored = await chromeStorage?.get?.(AI_USER_SETTINGS_STORAGE_KEY);
    const parsed = stored?.[AI_USER_SETTINGS_STORAGE_KEY] as
      | Partial<import("./ai-user-settings").AiUserSettings>
      | undefined;
    return normalizeAiUserSettings(parsed);
  } catch {
    return normalizeAiUserSettings(undefined);
  }
}

async function fetchJinaMarkdown(url: string, config: StrictTaggingConfig) {
  const headers: Record<string, string> = {
    Accept: "text/plain, text/markdown;q=0.9, */*;q=0.5",
  };
  if (config.jinaApiKey) headers.Authorization = `Bearer ${config.jinaApiKey}`;

  const response = await fetch(readerUrlFor(url), {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Jina Reader failed: HTTP ${response.status}`);
  }

  const markdown = (await response.text()).trim();
  if (markdown.length < 120) {
    throw new Error("Jina Reader returned too little content.");
  }
  return markdown.slice(0, 14_000);
}

function strictPromptCommon() {
  return [
    "你是 Hoardly 的严格书签打标器。",
    "必须只输出 JSON 对象，不要解释。",
    "标签必须是英文小写 slug 风格，描述网页用途、内容类型或使用场景。",
    "禁止使用 topic、url、link、website、webpage、resource、misc、other、unknown、qs。",
    "禁止把公司名、域名、标题词原样作为单独标签，除非它同时是不可替代的技术类别。",
    "优先从 taxonomy 的 preferredTags 中选择；如果不够准确，可以输出更具体的专业词。",
    "目标是 3 个最准确标签，而不是泛泛分类。",
  ].join("\n");
}

async function classifyWithJinaReader(
  bookmark: BookmarkMetadata,
  config: StrictTaggingConfig,
): Promise<StrictMethodResult> {
  const markdown = await fetchJinaMarkdown(bookmark.url, config);
  const parsed = await runJsonCompletion(
    [
      strictPromptCommon(),
      "方法一：Jina Reader 已将网页转换为干净 Markdown。你必须基于 markdown + taxonomy + few-shot 进行判断。",
      "输出 JSON：{\"tags\":[\"...\",\"...\",\"...\"],\"summary\":\"...\",\"categoryId\":\"...\",\"confidence\":0.0}",
    ].join("\n"),
    {
      method: "jina-reader",
      url: bookmark.url,
      title: bookmark.title,
      markdown,
      taxonomy: summarizeTaxonomyForPrompt(),
      fewShotExamples: BOOKMARK_TAGGING_FEW_SHOTS,
    },
    0.05,
  );
  const result = asStrictFinalResult(parsed);
  const brand = buildBrandSlugBlocklist(bookmark.url, {
    documentTitle: bookmark.title,
  });
  const tags = sanitizeStrictTags(result.tags, brand);
  if (tags.length !== 3) throw new Error("Jina Reader method returned invalid tags.");
  return {
    engine: "jina-reader",
    tags,
    summary: result.summary?.trim() || markdown.slice(0, 240),
    categoryId: result.categoryId,
    confidence: clampConfidence(result.confidence),
    evidence: markdown.slice(0, 4000),
  };
}

function firecrawlApiKey(config: StrictTaggingConfig) {
  return config.firecrawlApiKey;
}

function firecrawlEndpoint(config: StrictTaggingConfig) {
  return config.firecrawlApiUrl;
}

function crawl4AiEndpoint(config: StrictTaggingConfig) {
  return config.crawl4AiEndpoint;
}

function strictExtractionPrompt(bookmark: BookmarkMetadata) {
  return [
    strictPromptCommon(),
    `请抓取并理解这个书签页面：${bookmark.url}`,
    `书签标题：${bookmark.title}`,
    "根据页面真实内容返回 tags、summary、categoryId、confidence。",
    "tags 必须恰好 3 个，并符合 taxonomy/few-shot 的尺度。",
  ].join("\n");
}

async function classifyWithFirecrawl(
  bookmark: BookmarkMetadata,
  config: StrictTaggingConfig,
): Promise<StrictMethodResult> {
  const apiKey = firecrawlApiKey(config);
  if (!apiKey) throw new Error("Firecrawl API key is not configured.");

  const response = await fetch(firecrawlEndpoint(config), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: bookmark.url,
      formats: [
        {
          type: "json",
          prompt: strictExtractionPrompt(bookmark),
          schema: FIRECRAWL_SCHEMA,
        },
        { type: "markdown" },
      ],
      onlyMainContent: true,
      timeout: 120000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firecrawl failed: HTTP ${response.status} ${text.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    data?: { json?: unknown; markdown?: string; metadata?: { title?: string; description?: string } };
    json?: unknown;
    markdown?: string;
  };
  const rawJson = payload.data?.json ?? payload.json;
  const result = asStrictFinalResult(rawJson);
  const markdown = payload.data?.markdown ?? payload.markdown ?? "";
  const brand = buildBrandSlugBlocklist(bookmark.url, {
    documentTitle: payload.data?.metadata?.title ?? bookmark.title,
    ogTitle: payload.data?.metadata?.description,
  });
  const tags = sanitizeStrictTags(result.tags, brand);
  if (tags.length !== 3) throw new Error("Firecrawl method returned invalid tags.");

  return {
    engine: "firecrawl",
    tags,
    summary: result.summary?.trim() || payload.data?.metadata?.description || markdown.slice(0, 240),
    categoryId: result.categoryId,
    confidence: clampConfidence(result.confidence),
    evidence: markdown.slice(0, 4000),
  };
}

async function classifyWithCrawl4Ai(
  bookmark: BookmarkMetadata,
  config: StrictTaggingConfig,
): Promise<StrictMethodResult> {
  const endpoint = crawl4AiEndpoint(config);
  if (!endpoint) throw new Error("Crawl4AI endpoint is not configured.");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: bookmark.url,
      schema: FIRECRAWL_SCHEMA,
      instruction: strictExtractionPrompt(bookmark),
      taxonomy: summarizeTaxonomyForPrompt(),
      fewShotExamples: BOOKMARK_TAGGING_FEW_SHOTS,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Crawl4AI failed: HTTP ${response.status} ${text.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    extracted_content?: unknown;
    json?: unknown;
    markdown?: string;
    cleaned_html?: string;
    success?: boolean;
  };
  if (payload.success === false) throw new Error("Crawl4AI reported success=false.");

  const rawJson =
    typeof payload.extracted_content === "string"
      ? extractJsonObject(payload.extracted_content)
      : payload.extracted_content ?? payload.json;
  const result = asStrictFinalResult(rawJson);
  const evidence = payload.markdown ?? payload.cleaned_html ?? "";
  const brand = buildBrandSlugBlocklist(bookmark.url, {
    documentTitle: bookmark.title,
  });
  const tags = sanitizeStrictTags(result.tags, brand);
  if (tags.length !== 3) throw new Error("Crawl4AI method returned invalid tags.");

  return {
    engine: "crawl4ai",
    tags,
    summary: result.summary?.trim() || evidence.slice(0, 240),
    categoryId: result.categoryId,
    confidence: clampConfidence(result.confidence),
    evidence: evidence.slice(0, 4000),
  };
}

async function classifyWithMethodTwo(
  bookmark: BookmarkMetadata,
  config: StrictTaggingConfig,
): Promise<StrictMethodResult> {
  const errors: string[] = [];

  if (firecrawlApiKey(config)) {
    try {
      return await classifyWithFirecrawl(bookmark, config);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Firecrawl failed");
    }
  } else {
    errors.push("Firecrawl API key missing");
  }

  if (crawl4AiEndpoint(config)) {
    try {
      return await classifyWithCrawl4Ai(bookmark, config);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Crawl4AI failed");
    }
  } else {
    errors.push("Crawl4AI endpoint missing");
  }

  throw new Error(`Method 2 failed: ${errors.join("; ")}`);
}

function clampConfidence(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

async function crossValidateStrictMethods(
  bookmark: BookmarkMetadata,
  methodOne: StrictMethodResult,
  methodTwo: StrictMethodResult,
): Promise<StrictFinalResult> {
  const parsed = await runJsonCompletion(
    [
      strictPromptCommon(),
      "你现在必须做最终交叉验证。方法一是 Jina Reader Markdown + LLM，方法二是 Firecrawl/Crawl4AI schema extraction。",
      "不得引入第三套抓取或本地关键词规则。只允许基于 methodOne 与 methodTwo 的证据、taxonomy、few-shot 判断。",
      "优先输出两个方法共同支持的标签；若两个方法冲突，选择更具体且有证据的一方，并在 agreedEvidence 说明。",
      "输出 JSON：{\"tags\":[\"...\",\"...\",\"...\"],\"summary\":\"...\",\"folderSuggestion\":\"...\",\"confidence\":0.0,\"agreedEvidence\":[\"...\"]}",
    ].join("\n"),
    {
      url: bookmark.url,
      title: bookmark.title,
      taxonomy: summarizeTaxonomyForPrompt(),
      fewShotExamples: BOOKMARK_TAGGING_FEW_SHOTS,
      methodOne,
      methodTwo,
    },
    0.03,
  );
  return asStrictFinalResult(parsed);
}

function taxonomyFolderFromTags(tags: string[]) {
  const hit = BOOKMARK_TAXONOMY.find((item) => item.tags.some((tag) => tags.includes(tag)));
  return hit?.labelZh ?? "AI Tagged";
}

function pendingReviewBookmark(bookmark: BookmarkMetadata, reason: string): BookmarkMetadata {
  return {
    ...bookmark,
    confidence: 0,
    description: `自动打标未完成：${reason}`,
    folderSuggestion: "Needs Review",
    lastAiReviewedAt: new Date().toISOString(),
    status: "pending_review",
    tags: [],
  };
}

async function classifyBookmarkStrict(bookmark: BookmarkMetadata): Promise<BookmarkMetadata> {
  try {
    const config = await resolveStrictTaggingConfig();
    const [methodOne, methodTwo] = await Promise.all([
      classifyWithJinaReader(bookmark, config),
      classifyWithMethodTwo(bookmark, config),
    ]);
    const final = await crossValidateStrictMethods(bookmark, methodOne, methodTwo);
    const brand = buildBrandSlugBlocklist(bookmark.url, {
      documentTitle: bookmark.title,
    });
    const tags = sanitizeStrictTags(final.tags, brand);
    if (tags.length !== 3) {
      throw new Error("Final cross-validation returned invalid tags.");
    }

    return {
      ...bookmark,
      confidence: clampConfidence(final.confidence ?? Math.min(methodOne.confidence, methodTwo.confidence)),
      description: final.summary?.trim() || methodOne.summary || methodTwo.summary,
      folderSuggestion: final.folderSuggestion?.trim() || taxonomyFolderFromTags(tags),
      lastAiReviewedAt: new Date().toISOString(),
      status: "active",
      tags,
    };
  } catch (error) {
    return pendingReviewBookmark(
      bookmark,
      error instanceof Error ? error.message : "Strict tagging failed",
    );
  }
}

async function runJsonCompletion(system: string, userPayload: unknown, temperature: number) {
  const { content } = await completeChatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(userPayload) },
    ],
    { jsonMode: true, temperature },
  );
  return extractJsonObject(content);
}

function asTagMap(data: unknown): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const obj = data as TagBatchJson;
  for (const it of obj.items ?? []) {
    if (!it.bookmarkId || !Array.isArray(it.tags)) continue;
    const tags = it.tags
      .map((t) => slugTag(String(t)))
      .filter((tag) => isUsefulTag(tag));
    if (tags.length >= 3) map.set(it.bookmarkId, tags.slice(0, 3));
  }
  return map;
}

function sanitizeServiceTags(raw: string[] | undefined, brand: Set<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw ?? []) {
    const t = slugTag(x);
    if (!isUsefulTag(t, brand) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 6) break;
  }
  return out;
}

function taxonomyForBookmark(bookmark: BookmarkMetadata, evidence: ExtendedTagEvidence) {
  const text = [
    bookmark.title,
    bookmark.url,
    bookmark.description ?? "",
    evidence.signals.documentTitle ?? "",
    evidence.signals.metaDescription ?? "",
    evidence.signals.ogTitle ?? "",
    evidence.signals.ogDescription ?? "",
    evidence.signals.firstH1 ?? "",
    evidence.signals.readableText ?? "",
    evidence.localHeuristics.join(" "),
    evidence.ddgInstantAnswer,
  ].join("\n");

  return matchTaxonomyCandidates(text).map((item) => ({
    id: item.id,
    labelZh: item.labelZh,
    preferredTags: item.tags,
    score: item.score,
  }));
}

function looksLikeMailService(siteKindZh: string, url: string, tags: string[]): boolean {
  const u = url.toLowerCase();
  const mailZh = /邮箱|郵箱|邮件|电邮|邮件客户端|收发邮件|信箱/;
  const mailHost =
    /outlook\.|hotmail\.|live\.com|office\.com|office365|mail\.|gmail\.|proton\.|\.+163\.|126\.com|qq\.com\/mail|yahoo\.com\/mail|icloud\.com\/mail|zoho\.com\/mail/i.test(
      u,
    );
  const mailTag = tags.some((t) =>
    /^(email|webmail|e-mail|mailbox|imap|smtp|mail-client)$/i.test(slugTag(t)),
  );
  return mailZh.test(siteKindZh) || mailHost || mailTag;
}

function injectMailSemanticsIfNeeded(
  siteKindZh: string,
  url: string,
  phase1Tags: string[],
  candidates: string[],
): string[] {
  const p1 = phase1Tags.map((t) => slugTag(t));
  if (!looksLikeMailService(siteKindZh, url, [...p1, ...candidates])) return candidates;
  const hasMail = [...p1, ...candidates.map(slugTag)].some((t) =>
    /^(email|webmail|e-mail|mailbox|mail-client|imap)$/i.test(t),
  );
  if (hasMail) return candidates;
  return ["webmail", "email", ...candidates];
}

/** 必填 SOP：仅用每条里的 URL（bookmarkId 仅作键）完成「这是什么网站？给我 3 个标签」推断 */
async function askUrlOnlyThreeTags(batch: BookmarkMetadata[]): Promise<Map<string, string[]>> {
  const payload = batch.map((b) => ({
    bookmarkId: b.bookmarkId,
    url: b.url,
  }));
  try {
    const parsed = await runJsonCompletion(
      [
        "对每条书签，你只能使用该条的 url 字段，回答用户问题：「这是什么网站？可以给我 3 个标签描述这个网站吗？」",
        "不得把 bookmarkId 当作网页信息；不得假装读过页面正文，只能据域名与路径做合理推断。",
        "输出恰好 3 个英文小写功能/场景向标签（勿单独输出公司品牌英文）。",
        "只输出 JSON：",
        '{"items":[{"bookmarkId":"...","tags":["t1","t2","t3"]}]}',
        "items 条数与输入一致。",
      ].join("\n"),
      { bookmarks: payload },
      0.08,
    );
    return asTagMap(parsed);
  } catch {
    return new Map();
  }
}

const THIN_HTML_FOR_DEEP_PROBE = 120;

/** 非必选但重要：HTML 抓取失败或过短时，尝试后台标签页抽取正文节选 */
async function maybeAttachDeepPageProbe(
  batch: BookmarkMetadata[],
  evidenceList: ExtendedTagEvidence[],
): Promise<void> {
  for (let i = 0; i < batch.length; i += 1) {
    const b = batch[i]!;
    const ev = evidenceList[i]!;
    const narrLen = ev.signals.narrationForAi?.length ?? 0;
    const thin = !ev.signals.fetchOk || narrLen < THIN_HTML_FOR_DEEP_PROBE;
    if (!thin) continue;
    const text = await fetchDeepPageTextOptional(b.url);
    if (text.trim().length > 40) {
      ev.deepPageTextProbe = text.trim().slice(0, 5000);
    }
  }
}

async function inferSiteServiceProfiles(
  batch: BookmarkMetadata[],
  evidenceList: ExtendedTagEvidence[],
): Promise<Map<string, { siteKindZh: string; serviceTagsEn: string[] }>> {
  const map = new Map<string, { siteKindZh: string; serviceTagsEn: string[] }>();
  const payload = batch.map((b, i) => {
    const ev = evidenceList[i]!;
    const brand = buildBrandSlugBlocklist(b.url, {
      ogSiteName: ev.signals.ogSiteName,
      documentTitle: ev.signals.documentTitle,
      ogTitle: ev.signals.ogTitle,
    });
    return {
      bookmarkId: b.bookmarkId,
      title: b.title,
      url: b.url,
      evidenceDossier: buildEvidenceDossierForAi(b.url, b.title, ev),
      taxonomyCandidates: taxonomyForBookmark(b, ev),
      brandWordsDoNotUseAsTags: [...brand].slice(0, 16),
    };
  });

  try {
    const parsed = (await runJsonCompletion(
      [
        "你是「网站类型」识别器。每条输入含 evidenceDossier，材料含：",
        "A 页面 HTML 解析（站点自身描述，最高优先级）；F 必填 SOP「仅用 URL 反问」得到的三标签（权重仅次于 A）；",
        "若有「重要可选验证·后台打开页面」节选则一并参考；B 维基标题；C DDG 摘要；D 本地 URL 启发；E 缩略图外链（勿假装看见像素）。",
        "综合时遵守证据优先级：A > F > 其余（B/C/D/E 及可选正文节选）。",
        "请先理解「用户在此网站主要做什么」，用中文短语 siteKindZh 概括服务类型。",
        "再输出恰好 3 个英文功能关键词 serviceTagsEn（小写或短词），优先从 taxonomyCandidates.preferredTags 中选；若不够准确，可补充更具体的功能词。",
        "禁止单独使用公司商标式英文（如 microsoft、google、github 单独成词），禁止 topic、url、link、website、resource、misc、other。",
        "若证据表明是邮箱/邮件类，serviceTagsEn 须从 email、webmail、calendar、mailbox、imap、mail-client、smtp 等与邮件强相关的词中选三种组合。",
        "参考 few-shot 的尺度，输出必须能体现网站用途，而不是复述标题或域名。",
        "只输出 JSON：",
        '{"items":[{"bookmarkId":"...","siteKindZh":"...","serviceTagsEn":["a","b","c"]}]}',
        "items 条数与输入一致；每个 serviceTagsEn 长度恰好为 3。",
      ].join("\n"),
      {
        allowedTaxonomy: summarizeTaxonomyForPrompt(),
        fewShotExamples: BOOKMARK_TAGGING_FEW_SHOTS,
        bookmarks: payload,
      },
      0.06,
    )) as SiteServiceInferResponse;

    for (const item of parsed.items ?? []) {
      if (!item.bookmarkId) continue;
      const idx = batch.findIndex((x) => x.bookmarkId === item.bookmarkId);
      const bm = idx >= 0 ? batch[idx] : undefined;
      const ev = idx >= 0 ? evidenceList[idx] : undefined;
      const brand = buildBrandSlugBlocklist(bm?.url ?? "", {
        ogSiteName: ev?.signals.ogSiteName,
        documentTitle: ev?.signals.documentTitle,
        ogTitle: ev?.signals.ogTitle,
      });
      const tags = sanitizeServiceTags(item.serviceTagsEn, brand).slice(0, 3);
      const siteKindZh = (item.siteKindZh ?? "").trim() || "未分类网站";
      if (tags.length === 3) map.set(item.bookmarkId, { siteKindZh, serviceTagsEn: tags });
    }
  } catch {
    /* 忽略 */
  }

  return map;
}

async function draftTagsPass(
  batch: BookmarkMetadata[],
  evidenceList: ExtendedTagEvidence[],
  profileMap: Map<string, { siteKindZh: string; serviceTagsEn: string[] }>,
): Promise<Map<string, DraftItem>> {
  const payload = batch.map((b, i) => {
    const ev = evidenceList[i]!;
    const prof = profileMap.get(b.bookmarkId);
    return {
      bookmarkId: b.bookmarkId,
      title: b.title,
      url: b.url,
      storedDescription: b.description ?? "",
      folder: b.folderSuggestion ?? "",
      evidenceDossier: buildEvidenceDossierForAi(b.url, b.title, ev),
      taxonomyCandidates: taxonomyForBookmark(b, ev),
      siteServiceInference: prof
        ? { siteKindZh: prof.siteKindZh, serviceTagsEn: prof.serviceTagsEn }
        : null,
    };
  });

  const parsed = (await runJsonCompletion(
    [
      "你是书签整理助手。必须综合利用 evidenceDossier：优先级为 A（页面自身）> F（仅用 URL 反问三标签）> B/C/D/E 及可选后台正文节选；并结合 siteServiceInference（若有）。",
      "输出恰好 3 个英文 tags（功能/场景/媒介），并与 siteKindZh 语义一致。优先使用 taxonomyCandidates 的 preferredTags，但可以为了更准确而输出更具体的专业词。",
      "必须使用至少两种方法交叉确认：Readability-style 正文/HTML meta、URL-only AI 推断、taxonomyCandidates、本地 URL 启发、DDG/Wikipedia 摘要中至少两类一致。",
      "禁止 topic、url、link、website、resource、misc、other、unknown，也禁止把域名品牌或标题词原样当 tag。",
      "另输出 description：一句中文 50～120 字概括页面价值；folderSuggestion 为简短文件夹名。",
      "Few-shot 标准：OKLCH Color Picker -> color-tools, visual-design, ui-design；GitHub React -> javascript, ui-library, repository；Stripe API -> payments, api-docs, developer。",
      "只输出 JSON：",
      '{"items":[{"bookmarkId":"...","tags":["t1","t2","t3"],"description":"...","folderSuggestion":"..."}]}',
    ].join("\n"),
    { bookmarks: payload },
    0.1,
  )) as DraftResponse;

  const map = new Map<string, DraftItem>();
  for (const it of parsed.items ?? []) {
    if (it.bookmarkId) map.set(it.bookmarkId, it);
  }
  return map;
}

/** 校验 #1：证据绑定 — 每个 tag 须能被材料中的至少两类独立来源支持（可标注 A/F/B/C/D/E） */
async function validatorEvidenceBind(
  batch: BookmarkMetadata[],
  evidenceList: ExtendedTagEvidence[],
  current: Map<string, string[]>,
): Promise<Map<string, string[]>> {
  const payload = batch.map((b, i) => ({
    bookmarkId: b.bookmarkId,
    evidenceDossier: buildEvidenceDossierForAi(b.url, b.title, evidenceList[i]!),
    taxonomyCandidates: taxonomyForBookmark(b, evidenceList[i]!),
    tagsToCheck: current.get(b.bookmarkId) ?? [],
  }));

  try {
    const parsed = await runJsonCompletion(
      [
        "你是标签校验员 #1（证据绑定）。",
        "对每条书签，检查 tagsToCheck 中的 3 个词：是否都能从 evidenceDossier 里 A/F/B/C/D 或 taxonomyCandidates 中至少**两类不同来源**找到依据（例如 Readability 正文与 URL-only 三标签，或 HTML meta 与分类树）。",
        "若任一 tag 纯属臆测或与材料矛盾，重写整套 3 个 tags，使其仍满足功能描述且可被材料支持。",
        "禁止 topic、url、link、website、resource、misc、other、unknown。",
        "只输出 JSON：",
        '{"items":[{"bookmarkId":"...","tags":["t1","t2","t3"]}]}',
      ].join("\n"),
      { bookmarks: payload },
      0.05,
    );
    return asTagMap(parsed);
  } catch {
    return current;
  }
}

/** 校验 #2：检索/百科一致性 — 对照 B+C 与 URL，排除「像品牌词但无功能」的 tag */
async function validatorSearchCorpus(
  batch: BookmarkMetadata[],
  evidenceList: ExtendedTagEvidence[],
  current: Map<string, string[]>,
): Promise<Map<string, string[]>> {
  const payload = batch.map((b, i) => ({
    bookmarkId: b.bookmarkId,
    evidenceDossier: buildEvidenceDossierForAi(b.url, b.title, evidenceList[i]!),
    taxonomyCandidates: taxonomyForBookmark(b, evidenceList[i]!),
    tagsAfterCheck1: current.get(b.bookmarkId) ?? [],
  }));

  try {
    const parsed = await runJsonCompletion(
      [
        "你是标签校验员 #2（检索与百科一致性）。",
        "重点对照 evidenceDossier 中「校验源 B：维基」「校验源 C：DDG」与 URL。",
        "若 tagsAfterCheck1 与 B/C 明显矛盾（例如 B/C 表明是视频站却标成 email），或 tag 仅为品牌无功能/空泛词，则修正为 3 个功能向英文 tag。",
        "只输出 JSON：",
        '{"items":[{"bookmarkId":"...","tags":["t1","t2","t3"]}]}',
      ].join("\n"),
      { bookmarks: payload },
      0.05,
    );
    return asTagMap(parsed);
  } catch {
    return current;
  }
}

/** 校验 #3：终裁 — 综合前几轮与 siteKind，输出最终三词 */
async function validatorFinalAdjudicator(
  batch: BookmarkMetadata[],
  evidenceList: ExtendedTagEvidence[],
  profileMap: Map<string, { siteKindZh: string; serviceTagsEn: string[] }>,
  draftMap: Map<string, DraftItem>,
  afterV1: Map<string, string[]>,
  afterV2: Map<string, string[]>,
): Promise<Map<string, string[]>> {
  const payload = batch.map((b, i) => {
    const prof = profileMap.get(b.bookmarkId);
    const draft = draftMap.get(b.bookmarkId);
    return {
      bookmarkId: b.bookmarkId,
      title: b.title,
      url: b.url,
      evidenceDossier: buildEvidenceDossierForAi(b.url, b.title, evidenceList[i]!),
      taxonomyCandidates: taxonomyForBookmark(b, evidenceList[i]!),
      siteServiceInference: prof ?? null,
      draftTags: draft?.tags ?? [],
      afterValidator1: afterV1.get(b.bookmarkId) ?? [],
      afterValidator2: afterV2.get(b.bookmarkId) ?? [],
    };
  });

  try {
    const parsed = await runJsonCompletion(
      [
        "你是标签校验员 #3（终裁）。",
        "你已看到同一条书签的：siteServiceInference、draftTags、校验#1 输出、校验#2 输出与完整 evidenceDossier。",
        "请综合判断，输出**最终**恰好 3 个英文功能 tags：优先采信与多源证据最一致的一套；若多轮有冲突，以 A（页面自身，含 Readability-style 正文）与 F（仅用 URL 反问三标签）与 taxonomyCandidates 与 C DDG 与 siteKind 为准（A 优先于 F）。",
        "禁止输出公司品牌单独成 tag；必须可让读者理解「这是什么用途的书签」。",
        "禁止 topic、url、link、website、resource、misc、other、unknown。",
        "只输出 JSON：",
        '{"items":[{"bookmarkId":"...","tags":["t1","t2","t3"]}]}',
      ].join("\n"),
      { bookmarks: payload },
      0.04,
    );
    return asTagMap(parsed);
  } catch {
    return afterV2;
  }
}

async function gatherEvidenceChunked(
  batch: BookmarkMetadata[],
  chunkSize: number,
): Promise<ExtendedTagEvidence[]> {
  const out: ExtendedTagEvidence[] = [];
  for (let i = 0; i < batch.length; i += chunkSize) {
    const slice = batch.slice(i, i + chunkSize);
    const part = await Promise.all(slice.map((b) => gatherExtendedTagEvidence(b.url)));
    out.push(...part);
  }
  return out;
}

function mergeTagChain(
  bookmarkId: string,
  draft: DraftItem | undefined,
  vFinal: Map<string, string[]>,
  v2: Map<string, string[]>,
  v1: Map<string, string[]>,
): string[] {
  const pick = (arr: string[] | undefined) =>
    arr && arr.length >= 3 ? arr.slice(0, 3).map((x) => slugTag(x)) : null;
  return (
    pick(vFinal.get(bookmarkId)) ??
    pick(v2.get(bookmarkId)) ??
    pick(v1.get(bookmarkId)) ??
    (draft?.tags && draft.tags.length >= 3 ? draft.tags.map((x) => slugTag(String(x))).slice(0, 3) : null) ??
    []
  );
}

export async function classifyBookmarksWithAi(
  bookmarks: BookmarkMetadata[],
): Promise<BookmarkMetadata[]> {
  const out: BookmarkMetadata[] = [];
  for (const bookmark of bookmarks) {
    out.push(await classifyBookmarkStrict(bookmark));
  }
  return out;
}
