import type {
  HoardlyCard,
  HoardlyMaintenanceIssue,
  HoardlyProject,
  HoardlyTag,
  HoardlyTagDimension,
  HoardlyLocale,
  HoardlyThreadSnapshot,
  LocalizedText,
} from "../types/hoardly";

export const defaultHoardlyLocale: HoardlyLocale = "zh-CN";

export const hoardlyTags: HoardlyTag[] = [
  // ═══════════════════════════════════════════════════════════════════
  // topic (核心主题) — 40 个
  // ═══════════════════════════════════════════════════════════════════
  dtag("tag-hybrid-search",            "hybrid-search",            "Hybrid Search",            "混合搜索",            "ai","topic",4),
  dtag("tag-scaling-laws",             "scaling-laws",             "Scaling Laws",             "缩放定律",            "ai","topic",2),
  dtag("tag-content-distribution",     "content-distribution",     "Content Distribution",     "内容分发",            "ai","topic",1),
  dtag("tag-inference-optimization",   "inference-optimization",   "Inference Optimization",   "推理优化",            "ai","topic",2),
  dtag("tag-capture-fallback",         "capture-fallback",         "Capture Fallback",         "采集降级",            "ai","topic",2),
  dtag("tag-video-indexing",           "video-indexing",           "Video Indexing",           "视频索引",            "ai","topic",1),
  dtag("tag-glassmorphism",            "glassmorphism",            "Glassmorphism",            "磨砂玻璃拟态",        "ai","topic",1),
  dtag("tag-bookmark-management",      "bookmark-management",      "Bookmark Management",      "书签管理",            "ai","topic",2),
  dtag("tag-knowledge-export",         "knowledge-export",         "Knowledge Export",         "知识导出",            "ai","topic",2),
  dtag("tag-mcp-protocol",             "mcp-protocol",             "MCP Protocol",             "MCP 协议",            "ai","topic",2),
  dtag("tag-prompt-engineering",       "prompt-engineering",       "Prompt Engineering",       "提示工程",            "ai","topic",0),
  dtag("tag-fine-tuning",              "fine-tuning",              "Fine-Tuning",              "微调",                "ai","topic",0),
  dtag("tag-rlhf",                     "RLHF",                    "RLHF",                     "RLHF",                "ai","topic",0),
  dtag("tag-chain-of-thought",         "chain-of-thought",         "Chain of Thought",         "思维链",              "ai","topic",0),
  dtag("tag-function-calling",         "function-calling",         "Function Calling",         "函数调用",            "ai","topic",0),
  dtag("tag-multi-modal",              "multi-modal",              "Multi-Modal",              "多模态",              "ai","topic",0),
  dtag("tag-embedding-models",         "embedding-models",         "Embedding Models",         "嵌入模型",            "ai","topic",0),
  dtag("tag-tokenization",             "tokenization",             "Tokenization",             "分词",                "ai","topic",0),
  dtag("tag-attention-mechanism",       "attention-mechanism",      "Attention Mechanism",      "注意力机制",          "ai","topic",0),
  dtag("tag-transformer-architecture",  "transformer-architecture", "Transformer Architecture", "Transformer 架构",   "ai","topic",0),
  dtag("tag-edge-computing",           "edge-computing",           "Edge Computing",           "边缘计算",            "ai","topic",0),
  dtag("tag-web-scraping",             "web-scraping",             "Web Scraping",             "网页抓取",            "ai","topic",0),
  dtag("tag-data-pipeline",            "data-pipeline",            "Data Pipeline",            "数据管道",            "ai","topic",0),
  dtag("tag-real-time-sync",           "real-time-sync",           "Real-Time Sync",           "实时同步",            "ai","topic",0),
  dtag("tag-auth-patterns",            "auth-patterns",            "Auth Patterns",            "认证模式",            "ai","topic",0),
  dtag("tag-rate-limiting",            "rate-limiting",            "Rate Limiting",            "限流",                "ai","topic",0),
  dtag("tag-caching-strategy",         "caching-strategy",         "Caching Strategy",         "缓存策略",            "ai","topic",0),
  dtag("tag-api-design",               "api-design",               "API Design",               "API 设计",            "ai","topic",0),
  dtag("tag-graphql",                  "graphql",                  "GraphQL",                  "GraphQL",             "ai","topic",0),
  dtag("tag-rest-api",                 "rest-api",                 "REST API",                 "REST API",            "ai","topic",0),
  dtag("tag-websocket",                "websocket",                "WebSocket",                "WebSocket",           "ai","topic",0),
  dtag("tag-server-components",        "server-components",        "Server Components",        "服务端组件",          "ai","topic",0),
  dtag("tag-state-management",         "state-management",         "State Management",         "状态管理",            "ai","topic",0),
  dtag("tag-css-animation",            "css-animation",            "CSS Animation",            "CSS 动画",            "ai","topic",0),
  dtag("tag-responsive-design",        "responsive-design",        "Responsive Design",        "响应式设计",          "ai","topic",0),
  dtag("tag-accessibility",            "accessibility",            "Accessibility",            "无障碍",              "ai","topic",0),
  dtag("tag-performance-optimization", "performance-optimization", "Performance Optimization", "性能优化",            "ai","topic",0),
  dtag("tag-bundle-size",              "bundle-size",              "Bundle Size",              "包体积",              "ai","topic",0),
  dtag("tag-image-optimization",       "image-optimization",       "Image Optimization",       "图片优化",            "ai","topic",0),
  dtag("tag-seo",                      "seo",                      "SEO",                      "SEO",                 "ai","topic",0),

  // ═══════════════════════════════════════════════════════════════════
  // entity (命名实体) — 30 个
  // ═══════════════════════════════════════════════════════════════════
  dtag("tag-Supabase",       "Supabase",         "Supabase",         "Supabase",          "ai","entity",3),
  dtag("tag-pgvector",       "pgvector",         "pgvector",         "pgvector",          "ai","entity",3),
  dtag("tag-Raindrop",       "Raindrop",         "Raindrop",         "Raindrop",          "ai","entity",1),
  dtag("tag-Fabric",         "Fabric",           "Fabric",           "Fabric",            "ai","entity",1),
  dtag("tag-Karpathy",       "Andrej-Karpathy",  "Andrej Karpathy",  "Andrej Karpathy",  "ai","entity",1),
  dtag("tag-Mosseri",        "Adam-Mosseri",     "Adam Mosseri",     "Adam Mosseri",      "ai","entity",1),
  dtag("tag-OpenAI",         "OpenAI",           "OpenAI",           "OpenAI",            "ai","entity",0),
  dtag("tag-Anthropic",      "Anthropic",        "Anthropic",        "Anthropic",         "ai","entity",0),
  dtag("tag-Google-DeepMind","Google-DeepMind",  "Google DeepMind",  "Google DeepMind",   "ai","entity",0),
  dtag("tag-Meta-AI",        "Meta-AI",          "Meta AI",          "Meta AI",           "ai","entity",0),
  dtag("tag-Vercel",         "Vercel",           "Vercel",           "Vercel",            "ai","entity",0),
  dtag("tag-Nextjs",         "Next.js",          "Next.js",          "Next.js",           "ai","entity",0),
  dtag("tag-React",          "React",            "React",            "React",             "ai","entity",0),
  dtag("tag-Vue",            "Vue",              "Vue",              "Vue",               "ai","entity",0),
  dtag("tag-Tailwind",       "Tailwind-CSS",     "Tailwind CSS",     "Tailwind CSS",      "ai","entity",0),
  dtag("tag-Postgres",       "PostgreSQL",       "PostgreSQL",       "PostgreSQL",        "ai","entity",0),
  dtag("tag-Redis",          "Redis",            "Redis",            "Redis",             "ai","entity",0),
  dtag("tag-Cloudflare",     "Cloudflare",       "Cloudflare",       "Cloudflare",        "ai","entity",0),
  dtag("tag-AWS",            "AWS",              "AWS",              "AWS",               "ai","entity",0),
  dtag("tag-Docker",         "Docker",           "Docker",           "Docker",            "ai","entity",0),
  dtag("tag-Kubernetes",     "Kubernetes",       "Kubernetes",       "Kubernetes",        "ai","entity",0),
  dtag("tag-LangChain",      "LangChain",        "LangChain",        "LangChain",         "ai","entity",0),
  dtag("tag-LlamaIndex",     "LlamaIndex",       "LlamaIndex",       "LlamaIndex",        "ai","entity",0),
  dtag("tag-Pinecone",       "Pinecone",         "Pinecone",         "Pinecone",          "ai","entity",0),
  dtag("tag-Weaviate",       "Weaviate",         "Weaviate",         "Weaviate",          "ai","entity",0),
  dtag("tag-Figma",          "Figma",            "Figma",            "Figma",             "ai","entity",0),
  dtag("tag-Stripe",         "Stripe",           "Stripe",           "Stripe",            "ai","entity",0),
  dtag("tag-GitHub",         "GitHub",           "GitHub",           "GitHub",            "ai","entity",0),
  dtag("tag-Notion",         "Notion",           "Notion",           "Notion",            "ai","entity",0),
  dtag("tag-Obsidian",       "Obsidian",         "Obsidian",         "Obsidian",          "ai","entity",0),

  // ═══════════════════════════════════════════════════════════════════
  // method (方法/技术手段) — 20 个
  // ═══════════════════════════════════════════════════════════════════
  dtag("tag-RAG-pipeline",        "RAG-pipeline",        "RAG Pipeline",         "RAG 流水线",          "ai","method",4),
  dtag("tag-vector-indexing",     "vector-indexing",      "Vector Indexing",      "向量索引",            "ai","method",3),
  dtag("tag-kv-cache",            "kv-cache-eviction",    "KV Cache Eviction",    "KV Cache 淘汰策略",  "ai","method",1),
  dtag("tag-speculative-dec",     "speculative-decoding", "Speculative Decoding", "推测解码",            "ai","method",1),
  dtag("tag-screenshot-fallback", "screenshot-fallback",  "Screenshot Fallback",  "截图兜底",            "ai","method",2),
  dtag("tag-semantic-search",     "semantic-search",      "Semantic Search",      "语义搜索",            "ai","method",3),
  dtag("tag-rrf-fusion",          "rrf-fusion",           "RRF Fusion",           "RRF 融合排序",        "ai","method",2),
  dtag("tag-few-shot-prompting",  "few-shot-prompting",   "Few-Shot Prompting",   "少样本提示",          "ai","method",0),
  dtag("tag-HNSW-index",          "HNSW-index",           "HNSW Index",           "HNSW 索引",           "ai","method",0),
  dtag("tag-quantization",        "quantization",         "Quantization",         "量化",                "ai","method",0),
  dtag("tag-distillation",        "distillation",         "Distillation",         "蒸馏",                "ai","method",0),
  dtag("tag-streaming-response",  "streaming-response",   "Streaming Response",   "流式响应",            "ai","method",0),
  dtag("tag-incremental-build",   "incremental-build",    "Incremental Build",    "增量构建",            "ai","method",0),
  dtag("tag-virtual-scrolling",   "virtual-scrolling",    "Virtual Scrolling",    "虚拟滚动",            "ai","method",0),
  dtag("tag-optimistic-ui",       "optimistic-ui",        "Optimistic UI",        "乐观更新",            "ai","method",0),
  dtag("tag-code-splitting",      "code-splitting",       "Code Splitting",       "代码分割",            "ai","method",0),
  dtag("tag-tree-shaking",        "tree-shaking",         "Tree Shaking",         "Tree Shaking",        "ai","method",0),
  dtag("tag-ab-testing",          "ab-testing",           "A/B Testing",          "A/B 测试",            "ai","method",0),
  dtag("tag-feature-flags",       "feature-flags",        "Feature Flags",        "功能开关",            "ai","method",0),
  dtag("tag-blue-green-deploy",   "blue-green-deploy",    "Blue-Green Deploy",    "蓝绿部署",            "ai","method",0),

  // ═══════════════════════════════════════════════════════════════════
  // useCase (用途场景) — 15 个
  // ═══════════════════════════════════════════════════════════════════
  dtag("tag-arch-reference",       "architecture-reference","Architecture Reference","架构参考",       "ai","useCase",4),
  dtag("tag-competitor-analysis",  "competitor-analysis",   "Competitor Analysis",  "竞品分析",        "ai","useCase",2),
  dtag("tag-api-docs",             "api-documentation",     "API Documentation",    "API 文档",        "ai","useCase",2),
  dtag("tag-ui-inspiration",       "ui-inspiration",        "UI Inspiration",       "界面灵感",        "user","useCase",2),
  dtag("tag-code-snippet",         "code-snippet",          "Code Snippet",         "代码片段",        "ai","useCase",0),
  dtag("tag-benchmark-data",       "benchmark-data",        "Benchmark Data",       "基准测试数据",    "ai","useCase",0),
  dtag("tag-tutorial-walkthrough", "tutorial-walkthrough",  "Tutorial Walkthrough", "教程演练",        "ai","useCase",0),
  dtag("tag-troubleshooting",      "troubleshooting",       "Troubleshooting",      "故障排查",        "ai","useCase",0),
  dtag("tag-migration-guide",      "migration-guide",       "Migration Guide",      "迁移指南",        "ai","useCase",0),
  dtag("tag-design-pattern",       "design-pattern",        "Design Pattern",       "设计模式参考",    "ai","useCase",0),
  dtag("tag-hiring-reference",     "hiring-reference",      "Hiring Reference",     "招聘参考",        "ai","useCase",0),
  dtag("tag-pricing-model",        "pricing-model",         "Pricing Model",        "定价模型参考",    "ai","useCase",0),
  dtag("tag-pitch-deck",           "pitch-deck",            "Pitch Deck",           "路演参考",        "ai","useCase",0),
  dtag("tag-case-study",           "case-study",            "Case Study",           "案例研究",        "ai","useCase",0),
  dtag("tag-opinion-piece",        "opinion-piece",         "Opinion Piece",        "观点文章",        "ai","useCase",0),

  // ═══════════════════════════════════════════════════════════════════
  // domain (所属领域) — 20 个
  // ═══════════════════════════════════════════════════════════════════
  dtag("tag-NLP",                "NLP",                     "NLP",                     "自然语言处理",      "ai","domain",3),
  dtag("tag-frontend-eng",       "frontend-engineering",    "Frontend Engineering",    "前端工程",          "ai","domain",2),
  dtag("tag-infra-retrieval",    "information-retrieval",   "Information Retrieval",   "信息检索",          "ai","domain",3),
  dtag("tag-social-media",       "social-media-engineering","Social Media Engineering","社交媒体工程",      "ai","domain",2),
  dtag("tag-backend-eng",        "backend-engineering",     "Backend Engineering",     "后端工程",          "ai","domain",0),
  dtag("tag-devops",             "devops",                  "DevOps",                  "DevOps",            "ai","domain",0),
  dtag("tag-ml-ops",             "ml-ops",                  "MLOps",                   "MLOps",             "ai","domain",0),
  dtag("tag-computer-vision",    "computer-vision",         "Computer Vision",         "计算机视觉",        "ai","domain",0),
  dtag("tag-robotics",           "robotics",                "Robotics",                "机器人学",          "ai","domain",0),
  dtag("tag-distributed-systems","distributed-systems",     "Distributed Systems",     "分布式系统",        "ai","domain",0),
  dtag("tag-security",           "security",                "Security",                "安全",              "ai","domain",0),
  dtag("tag-data-engineering",   "data-engineering",        "Data Engineering",        "数据工程",          "ai","domain",0),
  dtag("tag-mobile-dev",         "mobile-development",      "Mobile Development",      "移动开发",          "ai","domain",0),
  dtag("tag-game-dev",           "game-development",        "Game Development",        "游戏开发",          "ai","domain",0),
  dtag("tag-blockchain",         "blockchain",              "Blockchain",              "区块链",            "ai","domain",0),
  dtag("tag-product-management", "product-management",      "Product Management",      "产品管理",          "ai","domain",0),
  dtag("tag-ux-research",        "ux-research",             "UX Research",             "用户体验研究",      "ai","domain",0),
  dtag("tag-startup",            "startup",                 "Startup",                 "创业",              "ai","domain",0),
  dtag("tag-open-source",        "open-source",             "Open Source",             "开源",              "ai","domain",0),
  dtag("tag-education",          "education-tech",          "Education Tech",          "教育科技",          "ai","domain",0),

  // ── project / system ─────────────────────────────────────────────
  dtag("tag-project-hoardly","hoardly",     "Hoardly",     "Hoardly",  "project", undefined, 6),
  dtag("tag-maintenance",    "maintenance", "Maintenance", "库维护",   "system",  undefined, 2),
];

export const hoardlyProjects: HoardlyProject[] = [
  {
    id: "project-hoardly-mvp",
    name: "Hoardly MVP",
    slug: "hoardly-mvp",
    color: "#6366f1",
    status: "active",
    description: "主产品闭环：采集、全部流、项目、标签、搜索。",
    cardIds: ["card-fabric", "card-raindrop", "card-xhs", "card-mcp"],
  },
  {
    id: "project-social-adapters",
    name: "社交平台解析",
    slug: "social-adapters",
    color: "#0ea5e9",
    status: "active",
    description: "Reddit、Instagram、Facebook、小红书、B站等 PlatformAdapter。",
    cardIds: ["card-reddit", "card-twitter", "card-instagram", "card-linkedin", "card-threads", "card-xhs", "card-bilibili"],
  },
  {
    id: "project-ai-search",
    name: "AI 检索底座",
    slug: "ai-search",
    color: "#14b8a6",
    status: "active",
    description: "混合搜索、引用回答、MCP Server、Skill 导出。",
    cardIds: ["card-mcp", "card-rag", "card-skill", "card-linkedin", "card-wechat"],
  },
];

export const hoardlyCards: HoardlyCard[] = [
  {
    id: "card-fabric",
    type: "web",
    url: "https://fabric.so",
    titleOriginal: "Fabric as an AI-native personal archive",
    titleI18n: text("Fabric as an AI-native personal archive", "Fabric：AI 原生个人档案库"),
    summary: text(
      "A reference for multimodal capture, semantic search, and citation-backed answers.",
      "多模态采集、语义搜索与带引用回答的竞品参考。",
    ),
    thumbnailUrl: "https://fabric.so/og-image.png",
    sourcePlatform: "fabric.so",
    tagIds: [
      "tag-bookmark-management", "tag-semantic-search", "tag-knowledge-export", "tag-multi-modal",
      "tag-Fabric", "tag-OpenAI", "tag-LangChain", "tag-Pinecone",
      "tag-RAG-pipeline", "tag-vector-indexing", "tag-HNSW-index", "tag-streaming-response",
      "tag-arch-reference", "tag-competitor-analysis", "tag-case-study", "tag-benchmark-data",
      "tag-NLP", "tag-infra-retrieval", "tag-product-management", "tag-open-source",
    ],
    projectIds: ["project-hoardly-mvp"],
    captureMode: "capture",
    contentMarkdown: `# Fabric — AI-native Personal Archive

Fabric is a personal knowledge archive that lets you save anything from the web and retrieve it with AI.

## Key Features

- **Multimodal capture**: Save web pages, PDFs, tweets, YouTube videos, and notes
- **Semantic search**: Find saved items by meaning, not just keywords
- **Citation-backed answers**: AI answers always link back to the source material
- **Collections & tags**: Organize with flexible, flat collections

## Architecture Notes

- Uses vector embeddings (OpenAI) for semantic search
- RAG pipeline for Q&A with citations
- Chrome extension + mobile app capture flow
- Supports 10+ content types

> "AI answers need citations to be trusted." — This is a hard requirement for any AI-powered knowledge tool.
`,
    attachments: [],
    parseStatus: "ready",
    storageLocation: "cloud",
    starred: true,
    createdAt: daysAgo(0.2),
    lastOpenedAt: daysAgo(0.1),
    highlights: [
      {
        id: "hl-fabric-1",
        quoteText: "AI answers need citations to be trusted.",
        noteText: "对应文档里的 proof & citations 硬性要求。",
        color: "yellow",
        createdAt: daysAgo(0.1),
      },
    ],
  },
  {
    id: "card-raindrop",
    type: "web",
    url: "https://raindrop.io",
    titleOriginal: "Raindrop card grid and collection behavior",
    titleI18n: text("Raindrop card grid and collection behavior", "Raindrop 卡片网格与收藏行为"),
    summary: text(
      "Use as a visual card and metadata parsing reference, but avoid permanent nested folders.",
      "参考其卡片体验与元数据解析，但不采用永久嵌套文件夹。",
    ),
    thumbnailUrl: "https://raindrop.io/img/brand/og.png",
    sourcePlatform: "raindrop.io",
    tagIds: [
      "tag-bookmark-management", "tag-glassmorphism", "tag-responsive-design", "tag-css-animation",
      "tag-Raindrop", "tag-Figma", "tag-React", "tag-Tailwind",
      "tag-screenshot-fallback", "tag-optimistic-ui", "tag-virtual-scrolling", "tag-code-splitting",
      "tag-ui-inspiration", "tag-competitor-analysis", "tag-design-pattern", "tag-tutorial-walkthrough",
      "tag-frontend-eng", "tag-ux-research", "tag-product-management", "tag-open-source",
    ],
    projectIds: ["project-hoardly-mvp"],
    captureMode: "bookmark",
    attachments: [],
    parseStatus: "ready",
    storageLocation: "cloud",
    starred: false,
    createdAt: daysAgo(1),
    highlights: [],
  },
  {
    id: "card-reddit",
    type: "reddit",
    url: "https://www.reddit.com/r/selfhosted/comments/example",
    titleOriginal: "Reddit thread capture and subreddit filters",
    titleI18n: text("Reddit thread capture and subreddit filters", "Reddit 帖子采集与子版块筛选"),
    summary: text(
      "Save the main post by default, keep optional thread snapshots out of embedding.",
      "默认保存主帖，可选线程快照；线程不进入 embedding。",
    ),
    sourcePlatform: "reddit",
    subreddit: "r/selfhosted",
    authorHandle: "u/example_user",
    wordCount: 420,
    tagIds: [
      "tag-capture-fallback", "tag-bookmark-management", "tag-web-scraping", "tag-auth-patterns",
      "tag-pgvector", "tag-Supabase", "tag-Docker", "tag-GitHub",
      "tag-screenshot-fallback", "tag-streaming-response", "tag-feature-flags", "tag-incremental-build",
      "tag-arch-reference", "tag-code-snippet", "tag-troubleshooting", "tag-case-study",
      "tag-social-media", "tag-backend-eng", "tag-devops", "tag-open-source",
    ],
    projectIds: ["project-social-adapters"],
    captureMode: "capture",
    contentMarkdown: `## r/selfhosted — Has anyone tried running Hoardly-like capture on a self-hosted stack?

**u/example_user** · 128 upvotes

Has anyone tried running Hoardly-like capture on a self-hosted stack? Looking for guidance on the extension → Postgres pipeline.

### Top Replies

**u/selfhosted_dev** (64↑): I use a similar setup with a lightweight Hono worker on Fly.io. The extension posts to a \`/capture\` endpoint which writes to Postgres. Works well for personal use.

**u/pgvector_fan** (41↑): Add pgvector from the start — retrofitting embeddings onto an existing table is painful. Use \`halfvec\` for smaller footprint.
`,
    attachments: [],
    parseStatus: "ready",
    storageLocation: "cloud",
    starred: false,
    createdAt: daysAgo(0.05),
    highlights: [],
    threadSnapshot: threadSnapshotSample(),
  },
  {
    id: "card-twitter",
    type: "tweet",
    url: "https://x.com/karpathy/status/1234567890",
    titleOriginal: "Andrej Karpathy on scaling laws and emergence",
    titleI18n: text("Andrej Karpathy on scaling laws and emergence", "Karpathy 关于 scaling law 与涌现现象"),
    summary: text(
      "A must-read thread on why emergence is not binary and how loss curves tell the real story.",
      "关于涌现不是非黑即白、以及 loss 曲线才是真正信号的必读长帖。",
    ),
    sourcePlatform: "x.com",
    authorHandle: "@karpathy",
    tagIds: [
      "tag-scaling-laws", "tag-inference-optimization", "tag-chain-of-thought", "tag-attention-mechanism",
      "tag-Karpathy", "tag-OpenAI", "tag-Google-DeepMind", "tag-Meta-AI",
      "tag-RAG-pipeline", "tag-quantization", "tag-distillation", "tag-few-shot-prompting",
      "tag-arch-reference", "tag-benchmark-data", "tag-opinion-piece", "tag-case-study",
      "tag-NLP", "tag-ml-ops", "tag-distributed-systems", "tag-open-source",
    ],
    projectIds: ["project-social-adapters"],
    captureMode: "capture",
    contentMarkdown: `# @karpathy — Scaling Laws and Emergence

**Andrej Karpathy** · @karpathy · x.com

A thread on why emergence is not binary and how loss curves tell the real story.

---

**1/5** People keep asking "does GPT-4 have emergent abilities?" — this is the wrong question. Emergence is not a binary switch. It's a continuous phenomenon visible in the loss curve long before it shows up in benchmarks.

**2/5** The loss curve is smooth. Capabilities are not. This is because benchmarks have sharp thresholds (e.g. "is the answer correct?") but the underlying probability distribution shifts gradually.

**3/5** So when someone says "emergence appeared at 10^22 FLOPs" what they really mean is "our benchmark resolution was too coarse to detect the gradual improvement before that point."

**4/5** This has huge implications for safety: we can't rely on "it didn't have this capability at N params" because the capability was building up continuously.

**5/5** Bottom line: watch the loss curves, not the benchmark thresholds. The loss never lies.
`,
    attachments: [],
    parseStatus: "ready",
    storageLocation: "cloud",
    starred: true,
    createdAt: daysAgo(0.3),
    highlights: [],
  },
  {
    id: "card-instagram",
    type: "instagram",
    url: "https://www.instagram.com/p/example123/",
    titleOriginal: "Design inspiration — glassmorphism card set",
    titleI18n: text("Design inspiration — glassmorphism card set", "设计参考 — 磨砂玻璃卡片组"),
    summary: text(
      "Screenshot saved — login wall blocked full metadata parsing.",
      "已截图保存 — 登录墙阻止了完整元数据解析。",
    ),
    sourcePlatform: "instagram",
    authorHandle: "@design_lab",
    tagIds: [
      "tag-glassmorphism", "tag-css-animation", "tag-responsive-design", "tag-image-optimization",
      "tag-Figma", "tag-React", "tag-Tailwind", "tag-Vercel",
      "tag-screenshot-fallback", "tag-optimistic-ui", "tag-virtual-scrolling", "tag-code-splitting",
      "tag-ui-inspiration", "tag-design-pattern", "tag-tutorial-walkthrough", "tag-case-study",
      "tag-frontend-eng", "tag-ux-research", "tag-mobile-dev", "tag-startup",
    ],
    projectIds: ["project-social-adapters"],
    captureMode: "capture",
    attachments: [{
      id: "att-ig-screenshot",
      originalName: "instagram-glassmorphism-screenshot.png",
      mimeType: "image/png",
      sizeBytes: 384_000,
      url: "https://placehold.co/1280x720/1a1a2e/e0e0ff?text=Instagram+Screenshot",
      mediaType: "image",
      width: 1280,
      height: 720,
      createdAt: daysAgo(1.2),
    }],
    parseStatus: "failed",
    parseFailReason: "login_wall",
    storageLocation: "cloud",
    starred: false,
    createdAt: daysAgo(1.2),
    highlights: [],
    noteMarkdown: "玻璃拟态卡片 — 后续参考实现 Hoardly 卡片 hover 效果。",
  },
  {
    id: "card-linkedin",
    type: "linkedin",
    url: "https://www.linkedin.com/posts/example-post",
    titleOriginal: "How we cut our RAG latency by 60%",
    titleI18n: text("How we cut our RAG latency by 60%", "我们如何将 RAG 延迟降低 60%"),
    summary: text(
      "Login wall detected — link saved, manual title added.",
      "检测到登录墙 — 链接已保存，标题已手动补充。",
    ),
    sourcePlatform: "linkedin",
    authorHandle: "example-author",
    tagIds: [
      "tag-hybrid-search", "tag-inference-optimization", "tag-caching-strategy", "tag-rate-limiting",
      "tag-LangChain", "tag-Pinecone", "tag-Anthropic", "tag-AWS",
      "tag-RAG-pipeline", "tag-vector-indexing", "tag-HNSW-index", "tag-streaming-response",
      "tag-arch-reference", "tag-benchmark-data", "tag-code-snippet", "tag-migration-guide",
      "tag-NLP", "tag-infra-retrieval", "tag-backend-eng", "tag-distributed-systems",
    ],
    projectIds: ["project-social-adapters", "project-ai-search"],
    captureMode: "bookmark",
    attachments: [],
    parseStatus: "failed",
    parseFailReason: "login_wall",
    storageLocation: "cloud",
    starred: false,
    createdAt: daysAgo(2.5),
    highlights: [],
  },
  {
    id: "card-threads",
    type: "threads",
    url: "https://www.threads.net/@mosseri/post/example",
    titleOriginal: "Mosseri on Threads content distribution algorithm",
    titleI18n: text("Mosseri on Threads content distribution algorithm", "Mosseri 谈 Threads 内容分发算法"),
    summary: text(
      "Notes on how Threads surfaces content differently from Instagram Feed.",
      "关于 Threads 与 Instagram Feed 内容分发逻辑差异的要点。",
    ),
    sourcePlatform: "threads.net",
    authorHandle: "@mosseri",
    tagIds: [
      "tag-content-distribution", "tag-real-time-sync", "tag-data-pipeline", "tag-api-design",
      "tag-Mosseri", "tag-Meta-AI", "tag-React", "tag-Nextjs",
      "tag-few-shot-prompting", "tag-ab-testing", "tag-feature-flags", "tag-streaming-response",
      "tag-competitor-analysis", "tag-case-study", "tag-opinion-piece", "tag-pricing-model",
      "tag-social-media", "tag-product-management", "tag-startup", "tag-ux-research",
    ],
    projectIds: ["project-social-adapters"],
    captureMode: "capture",
    contentMarkdown: `# @mosseri — Threads Content Distribution

**Adam Mosseri** · @mosseri · threads.net

Threads surfaces content differently from Instagram Feed. The algorithm prioritizes:

1. **Interest signals** over follower graph
2. **Conversation depth** (replies-to-replies) over likes alone
3. **Time decay** is steeper — content cycles are 4-6 hours vs 24-48 on IG
4. **Cross-platform signals**: activity on IG boosts Threads recommendations

Key takeaway: If you're building a social content capture tool, you need platform-specific heuristics for what constitutes "valuable" content worth saving.
`,
    attachments: [],
    parseStatus: "ready",
    storageLocation: "cloud",
    starred: false,
    createdAt: daysAgo(3),
    highlights: [],
  },
  {
    id: "card-wechat",
    type: "wechat",
    url: "https://mp.weixin.qq.com/s/example_article_id",
    titleOriginal: "大模型推理优化：从 KV Cache 到 Speculative Decoding",
    titleI18n: text("LLM inference optimization: KV Cache to Speculative Decoding", "大模型推理优化：从 KV Cache 到 Speculative Decoding"),
    summary: text(
      "A deep-dive WeChat article on LLM inference optimization techniques, including KV cache eviction and speculative decoding.",
      "深度解析大模型推理优化技术：KV Cache 淘汰策略与 Speculative Decoding 原理。",
    ),
    sourcePlatform: "mp.weixin.qq.com",
    tagIds: [
      "tag-inference-optimization", "tag-scaling-laws", "tag-attention-mechanism", "tag-transformer-architecture",
      "tag-OpenAI", "tag-Anthropic", "tag-Google-DeepMind", "tag-LlamaIndex",
      "tag-kv-cache", "tag-speculative-dec", "tag-quantization", "tag-distillation",
      "tag-arch-reference", "tag-benchmark-data", "tag-tutorial-walkthrough", "tag-code-snippet",
      "tag-NLP", "tag-ml-ops", "tag-distributed-systems", "tag-data-engineering",
    ],
    projectIds: ["project-ai-search"],
    captureMode: "capture",
    contentMarkdown: `# 大模型推理优化：从 KV Cache 到 Speculative Decoding

## 1. KV Cache 淘汰策略

Transformer 推理时，每个 token 的 Key/Value 需要缓存以避免重复计算。当序列长度增长时，KV Cache 占用的显存线性增长。

常见淘汰策略：
- **滑动窗口**：只保留最近 N 个 token 的 KV
- **注意力权重淘汰**：丢弃注意力权重最低的 KV 对
- **H2O (Heavy-Hitter Oracle)**：保留累计注意力最高的 token + 最近窗口

## 2. Speculative Decoding

核心思路：用小模型快速"猜"多个 token，再用大模型一次性验证。

\`\`\`
小模型生成: [t1, t2, t3, t4, t5]  (5 tokens, 快速)
大模型验证: [t1✓, t2✓, t3✓, t4✗]  (并行验证, 接受前 3 个)
→ 实际推理速度提升 2-3x
\`\`\`

## 3. 量化 (Quantization)

- **GPTQ**: 后训练量化，INT4/INT8
- **AWQ**: 激活感知量化，保护重要权重通道
- **GGUF**: llama.cpp 生态标准格式
`,
    attachments: [],
    parseStatus: "ready",
    storageLocation: "cloud",
    starred: true,
    createdAt: daysAgo(0.8),
    highlights: [],
  },
  {
    id: "card-xhs",
    type: "xhs",
    url: "https://www.xiaohongshu.com",
    titleOriginal: "Xiaohongshu capture fallback",
    titleI18n: text("Xiaohongshu capture fallback", "小红书采集降级策略"),
    summary: text(
      "Chinese social platform capture should prioritize user-triggered share links and extension-visible metadata.",
      "中文社交平台优先用户主动分享链接与扩展当前页可见元数据。",
    ),
    sourcePlatform: "xiaohongshu",
    tagIds: [
      "tag-capture-fallback", "tag-web-scraping", "tag-auth-patterns", "tag-image-optimization",
      "tag-React", "tag-Cloudflare", "tag-Vercel", "tag-Docker",
      "tag-screenshot-fallback", "tag-optimistic-ui", "tag-incremental-build", "tag-feature-flags",
      "tag-competitor-analysis", "tag-troubleshooting", "tag-migration-guide", "tag-case-study",
      "tag-social-media", "tag-mobile-dev", "tag-product-management", "tag-startup",
    ],
    projectIds: ["project-hoardly-mvp", "project-social-adapters"],
    captureMode: "capture",
    attachments: [],
    parseStatus: "failed",
    storageLocation: "cloud",
    starred: true,
    createdAt: daysAgo(2),
    highlights: [],
    noteMarkdown: "需要保留截图兜底和纯链接卡两级降级。",
  },
  {
    id: "card-bilibili",
    type: "bilibili",
    url: "https://www.bilibili.com",
    titleOriginal: "Bilibili subtitles for searchable video cards",
    titleI18n: text("Bilibili subtitles for searchable video cards", "B站字幕摘要与可检索视频卡"),
    summary: text(
      "Video cards only become valuable when subtitles and summaries enter the search index.",
      "视频卡片只有在字幕与摘要进入检索索引后才有核心价值。",
    ),
    sourcePlatform: "bilibili",
    tagIds: [
      "tag-video-indexing", "tag-multi-modal", "tag-data-pipeline", "tag-real-time-sync",
      "tag-React", "tag-Cloudflare", "tag-AWS", "tag-Redis",
      "tag-semantic-search", "tag-streaming-response", "tag-HNSW-index", "tag-code-splitting",
      "tag-arch-reference", "tag-tutorial-walkthrough", "tag-case-study", "tag-benchmark-data",
      "tag-NLP", "tag-computer-vision", "tag-data-engineering", "tag-open-source",
    ],
    projectIds: ["project-social-adapters"],
    captureMode: "capture",
    attachments: [],
    parseStatus: "ready",
    storageLocation: "cloud",
    starred: false,
    createdAt: daysAgo(4),
    highlights: [],
  },
  {
    id: "card-mcp",
    type: "note",
    titleOriginal: "MCP Server P0 scope",
    titleI18n: text("MCP Server P0 scope", "MCP Server P0 范围"),
    summary: text(
      "Expose search_cards, get_card, list_projects, and list_tags as the first AI data-source surface.",
      "首批暴露 search_cards、get_card、list_projects、list_tags，让收藏库成为 AI 数据源。",
    ),
    sourcePlatform: "manual",
    tagIds: [
      "tag-mcp-protocol", "tag-knowledge-export", "tag-api-design", "tag-function-calling",
      "tag-Supabase", "tag-Anthropic", "tag-OpenAI", "tag-GitHub",
      "tag-RAG-pipeline", "tag-semantic-search", "tag-streaming-response", "tag-feature-flags",
      "tag-api-docs", "tag-code-snippet", "tag-migration-guide", "tag-tutorial-walkthrough",
      "tag-infra-retrieval", "tag-backend-eng", "tag-security", "tag-open-source",
    ],
    projectIds: ["project-hoardly-mvp", "project-ai-search"],
    captureMode: "upload",
    contentMarkdown: `# MCP Server P0 Scope

## 暴露的接口

| Tool | 方法 | 说明 |
|------|------|------|
| search_cards | GET | 混合搜索卡片 |
| get_card | GET | 获取单张卡片详情 |
| list_projects | GET | 列出所有项目 |
| list_tags | GET | 列出标签库 |

## 权限控制

- 默认只读
- 读写权限通过设置页开关预留
- Token 鉴权（BYOK 模式）
`,
    attachments: [],
    parseStatus: "ready",
    storageLocation: "cloud",
    starred: true,
    createdAt: daysAgo(0.7),
    highlights: [],
    noteMarkdown: "只读优先，读写权限通过设置页开关预留。",
  },
  {
    id: "card-rag",
    type: "web",
    url: "https://supabase.com/docs/guides/ai/hybrid-search",
    titleOriginal: "Supabase hybrid search pattern",
    titleI18n: text("Supabase hybrid search pattern", "Supabase 混合搜索范式"),
    summary: text(
      "Reference for Postgres FTS plus pgvector ranking before introducing AI answer mode.",
      "接入 AI 问答前，先参考 Postgres FTS + pgvector 混合排序。",
    ),
    thumbnailUrl: "https://supabase.com/images/og/supabase-og.png",
    sourcePlatform: "supabase",
    tagIds: [
      "tag-hybrid-search", "tag-semantic-search", "tag-embedding-models", "tag-tokenization",
      "tag-Supabase", "tag-pgvector", "tag-Postgres", "tag-Weaviate",
      "tag-vector-indexing", "tag-rrf-fusion", "tag-HNSW-index", "tag-quantization",
      "tag-api-docs", "tag-arch-reference", "tag-benchmark-data", "tag-code-snippet",
      "tag-infra-retrieval", "tag-backend-eng", "tag-data-engineering", "tag-distributed-systems",
    ],
    projectIds: ["project-ai-search"],
    captureMode: "capture",
    attachments: [],
    parseStatus: "ready",
    storageLocation: "cloud",
    starred: false,
    createdAt: daysAgo(6),
    highlights: [],
  },
  {
    id: "card-skill",
    type: "doc",
    titleOriginal: "Skill export format",
    titleI18n: text("Skill export format", "Skill 知识包导出格式"),
    summary: text(
      "Export Markdown for humans and structured JSON for AI tools.",
      "面向人导出 Markdown，面向 AI 工具导出结构化 JSON。",
    ),
    sourcePlatform: "manual",
    tagIds: [
      "tag-knowledge-export", "tag-mcp-protocol", "tag-api-design", "tag-graphql",
      "tag-Notion", "tag-Obsidian", "tag-GitHub", "tag-Anthropic",
      "tag-RAG-pipeline", "tag-streaming-response", "tag-few-shot-prompting", "tag-tree-shaking",
      "tag-api-docs", "tag-migration-guide", "tag-design-pattern", "tag-case-study",
      "tag-NLP", "tag-backend-eng", "tag-product-management", "tag-education",
    ],
    projectIds: ["project-ai-search"],
    captureMode: "upload",
    contentMarkdown: `# Skill 知识包导出格式

## 面向人：Markdown

导出为标准 Markdown 文件，支持在 Obsidian / Notion / 任意编辑器中阅读和编辑。

## 面向 AI：结构化 JSON

\`\`\`json
{
  "title": "My Knowledge Pack",
  "cards": [...],
  "tags": [...],
  "metadata": {
    "exportedAt": "2026-07-01T00:00:00Z",
    "format": "hoardly-skill-v1"
  }
}
\`\`\`

可直接作为 MCP Resource 提供给 Claude / ChatGPT 等 AI 工具。
`,
    attachments: [],
    parseStatus: "ready",
    storageLocation: "hybrid",
    starred: false,
    createdAt: daysAgo(8),
    highlights: [],
  },
];

export const hoardlyMaintenanceIssues: HoardlyMaintenanceIssue[] = [
  {
    id: "issue-xhs-retry",
    type: "dead_link",
    title: "小红书采集需要重试",
    description: "登录墙导致解析失败，建议通过扩展截图兜底或手动补充标题。",
    severity: "medium",
    cardId: "card-xhs",
  },
  {
    id: "issue-tag-merge-ai",
    type: "tag_merge",
    title: "可合并相似标签",
    description: "`AI Agents` 与 `RAG` 有高共现，后续标签体检可提示合并或建立关系。",
    severity: "low",
  },
];

function dtag(
  id: string,
  slug: string,
  en: string,
  zh: string,
  origin: HoardlyTag["origin"],
  dimension: HoardlyTagDimension | undefined,
  usageCount: number,
): HoardlyTag {
  return {
    id,
    slug,
    labels: text(en, zh),
    origin,
    dimension,
    usageCount,
  };
}

function text(en: string, zh: string): LocalizedText {
  return {
    en,
    "zh-CN": zh,
  };
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function threadSnapshotSample(): HoardlyThreadSnapshot {
  return {
    capturedAt: daysAgo(0.05),
    totalPosts: 47,
    posts: [
      {
        id: "t-1",
        author: "example_user",
        authorHandle: "u/example_user",
        text: "Has anyone tried running Hoardly-like capture on a self-hosted stack? Looking for guidance on the extension → Postgres pipeline.",
        upvotes: 128,
        depth: 0,
      },
      {
        id: "t-2",
        author: "selfhosted_dev",
        authorHandle: "u/selfhosted_dev",
        text: "I use a similar setup with a lightweight Hono worker on Fly.io. The extension posts to a `/capture` endpoint which writes to Postgres. Works well for personal use.",
        upvotes: 64,
        depth: 1,
      },
      {
        id: "t-3",
        author: "pgvector_fan",
        authorHandle: "u/pgvector_fan",
        text: "Add pgvector from the start — retrofitting embeddings onto an existing table is painful. Use `halfvec` for smaller footprint.",
        upvotes: 41,
        depth: 1,
      },
    ],
  };
}
