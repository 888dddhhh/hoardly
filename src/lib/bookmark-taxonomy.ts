export type BookmarkTaxonomyCategory = {
  id: string;
  labelZh: string;
  tags: string[];
  keywords: string[];
};

export const BOOKMARK_TAXONOMY: BookmarkTaxonomyCategory[] = [
  {
    id: "ai-productivity",
    labelZh: "AI 效率工具",
    tags: ["ai-tools", "automation", "productivity"],
    keywords: ["ai", "agent", "llm", "prompt", "chatbot", "automation", "workflow"],
  },
  {
    id: "developer-docs",
    labelZh: "技术文档",
    tags: ["documentation", "developer", "reference"],
    keywords: ["docs", "documentation", "api", "sdk", "guide", "reference", "manual"],
  },
  {
    id: "code-repository",
    labelZh: "代码仓库",
    tags: ["code-hosting", "version-control", "repository"],
    keywords: ["github", "gitlab", "repository", "source code", "pull request", "npm"],
  },
  {
    id: "design-systems",
    labelZh: "设计系统",
    tags: ["design-system", "components", "ui-patterns"],
    keywords: ["design system", "component", "tokens", "ui kit", "figma", "shadcn"],
  },
  {
    id: "visual-design",
    labelZh: "视觉与色彩工具",
    tags: ["visual-design", "color-tools", "creative"],
    keywords: ["color", "palette", "oklch", "typography", "layout", "visual", "brand"],
  },
  {
    id: "research-papers",
    labelZh: "研究论文",
    tags: ["research", "academic", "papers"],
    keywords: ["paper", "arxiv", "research", "study", "journal", "citation", "abstract"],
  },
  {
    id: "market-finance",
    labelZh: "金融市场",
    tags: ["finance", "markets", "trading"],
    keywords: ["stock", "crypto", "trading", "market", "finance", "chart", "portfolio"],
  },
  {
    id: "data-analytics",
    labelZh: "数据分析",
    tags: ["data-analysis", "analytics", "dashboard"],
    keywords: ["analytics", "dashboard", "dataset", "sql", "metrics", "visualization"],
  },
  {
    id: "cloud-infra",
    labelZh: "云服务与基础设施",
    tags: ["cloud", "infrastructure", "hosting"],
    keywords: ["cloud", "server", "hosting", "deploy", "kubernetes", "vercel", "aws"],
  },
  {
    id: "web3-defi",
    labelZh: "Web3 / DeFi",
    tags: ["web3", "defi", "blockchain"],
    keywords: ["web3", "defi", "wallet", "blockchain", "dao", "token", "smart contract"],
  },
  {
    id: "learning-article",
    labelZh: "文章与学习资料",
    tags: ["articles", "learning", "reading"],
    keywords: ["article", "blog", "newsletter", "tutorial", "course", "learn", "essay"],
  },
  {
    id: "video-media",
    labelZh: "视频与媒体",
    tags: ["video", "media", "streaming"],
    keywords: ["video", "youtube", "stream", "channel", "watch", "media", "lecture"],
  },
  {
    id: "collaboration-workspace",
    labelZh: "协作工作台",
    tags: ["workspace", "collaboration", "knowledge-base"],
    keywords: ["workspace", "notion", "confluence", "document", "team", "project"],
  },
  {
    id: "email-calendar",
    labelZh: "邮箱与日历",
    tags: ["email", "webmail", "calendar"],
    keywords: ["mail", "email", "inbox", "calendar", "schedule", "imap", "smtp"],
  },
];

export const BOOKMARK_TAGGING_FEW_SHOTS = [
  {
    input: {
      title: "OKLCH Color Picker",
      description: "A tool to select perceptually uniform colors.",
      url: "https://oklch.com",
    },
    output: ["color-tools", "visual-design", "ui-design"],
  },
  {
    input: {
      title: "GitHub - facebook/react",
      description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
      url: "https://github.com/facebook/react",
    },
    output: ["javascript", "ui-library", "repository"],
  },
  {
    input: {
      title: "Stripe API Documentation",
      description: "API reference for payments, checkout, customers, subscriptions, and webhooks.",
      url: "https://docs.stripe.com/api",
    },
    output: ["payments", "api-docs", "developer"],
  },
];

export function summarizeTaxonomyForPrompt() {
  return BOOKMARK_TAXONOMY.map((item) => ({
    id: item.id,
    labelZh: item.labelZh,
    preferredTags: item.tags,
  }));
}

export function matchTaxonomyCandidates(text: string) {
  const normalized = text.toLowerCase();
  return BOOKMARK_TAXONOMY.map((item) => {
    const score = item.keywords.reduce(
      (sum, keyword) => sum + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
      0,
    );
    return { ...item, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
