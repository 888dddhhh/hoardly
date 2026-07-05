import path from "node:path";
import { execFile } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Connect } from "vite";
import { defineConfig, loadEnv, type Plugin } from "vite";

type AiProvider = "groq" | "openrouter" | "deepseek" | "openai";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss(), localAiProxy(env), localMcpServer()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

// ─── MCP Server ──────────────────────────────────────────────────────────────
// In-memory snapshot updated by POST /api/mcp/sync from the browser.
// Tools exposed (read-only by default):
//   GET  /api/mcp/cards              – list_cards
//   GET  /api/mcp/cards/search?q=…   – search_cards
//   GET  /api/mcp/cards/:id          – get_card
//   POST /api/mcp/sync               – browser → server sync (internal)

type McpLibrarySnapshot = {
  cards: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  tags: Array<Record<string, unknown>>;
  updatedAt: string;
};

function localMcpServer(): Plugin {
  let snapshot: McpLibrarySnapshot = { cards: [], projects: [], tags: [], updatedAt: "" };

  return {
    name: "hoardly-mcp-server",
    configureServer(server) {
      server.middlewares.use("/api/mcp", async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Content-Type", "application/json");

        if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }

        const url = new URL(req.url ?? "/", "http://localhost");
        const pathname = url.pathname.replace(/^\/api\/mcp/, "");

        // POST /api/mcp/sync  — browser pushes library snapshot
        if (req.method === "POST" && pathname === "/sync") {
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", () => {
            try {
              snapshot = { ...JSON.parse(body) as McpLibrarySnapshot, updatedAt: new Date().toISOString() };
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, count: snapshot.cards.length }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
          });
          return;
        }

        // GET /api/mcp/cards
        if (req.method === "GET" && pathname === "/cards") {
          const page = Number(url.searchParams.get("page") ?? "1");
          const limit = Math.min(100, Number(url.searchParams.get("limit") ?? "20"));
          const start = (page - 1) * limit;
          const active = snapshot.cards.filter((c) => !(c as { deletedAt?: string }).deletedAt);
          res.end(JSON.stringify({
            cards: active.slice(start, start + limit),
            total: active.length,
            page,
            limit,
            updatedAt: snapshot.updatedAt,
          }));
          return;
        }

        // GET /api/mcp/cards/search?q=…
        if (req.method === "GET" && pathname === "/cards/search") {
          const q = (url.searchParams.get("q") ?? "").toLowerCase();
          const matches = snapshot.cards.filter((c) => {
            if ((c as { deletedAt?: string }).deletedAt) return false;
            const haystack = [
              (c as { titleOriginal?: string }).titleOriginal ?? "",
              (c as { sourcePlatform?: string }).sourcePlatform ?? "",
              (c as { noteMarkdown?: string }).noteMarkdown ?? "",
            ].join(" ").toLowerCase();
            return haystack.includes(q);
          });
          res.end(JSON.stringify({ query: q, results: matches.slice(0, 20), total: matches.length }));
          return;
        }

        // GET /api/mcp/cards/:id
        if (req.method === "GET" && pathname.startsWith("/cards/")) {
          const id = pathname.slice("/cards/".length);
          const card = snapshot.cards.find((c) => (c as { id?: string }).id === id);
          if (!card) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Card not found" }));
            return;
          }
          res.end(JSON.stringify(card));
          return;
        }

        // GET /api/mcp/status
        if (req.method === "GET" && pathname === "/status") {
          res.end(JSON.stringify({
            ok: true,
            cards: snapshot.cards.filter((c) => !(c as { deletedAt?: string }).deletedAt).length,
            updatedAt: snapshot.updatedAt,
            endpoints: ["GET /api/mcp/cards", "GET /api/mcp/cards/search?q=", "GET /api/mcp/cards/:id"],
          }));
          return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Unknown MCP endpoint" }));
      });
    },
  };
}

function attachHoardlyApiMiddleware(middlewares: Connect.Server, env: Record<string, string | undefined>) {
  middlewares.use("/api/check-links", async (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body) as { urls?: string[] };
      const urls = Array.isArray(parsed.urls)
        ? parsed.urls.map((u) => String(u).trim()).filter(Boolean).slice(0, 40)
        : [];
      const results = [];
      for (const url of urls) {
        results.push(await checkRemoteUrl(url));
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ results }));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : "check-links failed",
        }),
      );
    }
  });

  middlewares.use("/api/ai/chat", async (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    try {
      const provider = getProvider(env);
      const apiKey = getApiKey(env, provider);
      if (!apiKey) {
        res.statusCode = 401;
        res.end(
          JSON.stringify({
            error: `Missing API key for ${provider}. Please set ${getApiKeyName(provider)} in .env.`,
          }),
        );
        return;
      }

      const requestBody = await readRequestBody(req);
      const upstream = await callAiProvider({
        apiKey,
        body: requestBody,
        endpoint: getEndpoint(env, provider),
        provider,
        referer: env.HOARDLY_APP_URL ?? "http://127.0.0.1:5173",
      });

      res.statusCode = upstream.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(upstream.body);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : "AI proxy failed",
        }),
      );
    }
  });
}

function localAiProxy(env: Record<string, string | undefined>): Plugin {
  return {
    name: "hoardly-local-ai-proxy",
    configureServer(server) {
      attachHoardlyApiMiddleware(server.middlewares, env);
    },
    configurePreviewServer(server) {
      attachHoardlyApiMiddleware(server.middlewares, env);
    },
  };
}

function callAiProvider({
  apiKey,
  body,
  endpoint,
  provider,
  referer,
}: {
  apiKey: string;
  body: string;
  endpoint: string;
  provider: AiProvider;
  referer: string;
}) {
  return new Promise<{ body: string; statusCode: number }>((resolve, reject) => {
    const args = [
      "-s",
      "-w",
      "\n%{http_code}",
      endpoint,
      "-H",
      `Authorization: Bearer ${apiKey}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      body,
    ];

    if (provider === "openrouter") {
      args.splice(
        6,
        0,
        "-H",
        `HTTP-Referer: ${referer}`,
        "-H",
        "X-Title: Hoardly",
      );
    }

    execFile("curl", args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      const markerIndex = stdout.lastIndexOf("\n");
      const responseBody = markerIndex === -1 ? stdout : stdout.slice(0, markerIndex);
      const statusCode = Number(stdout.slice(markerIndex + 1)) || 500;
      resolve({ body: responseBody, statusCode });
    });
  });
}

async function checkRemoteUrl(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Range: "bytes=0-0" },
      });
    }
    clearTimeout(timer);
    const ok = response.ok || (response.status >= 200 && response.status < 400);
    return {
      url,
      ok,
      status: response.status,
      reason: ok ? `HTTP ${response.status}` : `HTTP ${response.status}`,
    };
  } catch (error) {
    clearTimeout(timer);
    return {
      url,
      ok: false,
      reason: error instanceof Error ? error.message : "request_failed",
    };
  }
}

function readRequestBody(req: import("node:http").IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function getProvider(env: Record<string, string | undefined>): AiProvider {
  const provider = env.HOARDLY_AI_PROVIDER ?? env.VITE_HOARDLY_AI_PROVIDER ?? "openrouter";
  if (provider === "groq" || provider === "deepseek" || provider === "openai") {
    return provider;
  }
  return "openrouter";
}

function getApiKey(env: Record<string, string | undefined>, provider: AiProvider) {
  if (provider === "groq") return env.GROQ_API_KEY ?? env.VITE_GROQ_API_KEY;
  if (provider === "openrouter") return env.OPENROUTER_API_KEY ?? env.VITE_OPENROUTER_API_KEY;
  if (provider === "deepseek") return env.DEEPSEEK_API_KEY ?? env.VITE_DEEPSEEK_API_KEY;
  return env.OPENAI_API_KEY ?? env.VITE_OPENAI_API_KEY;
}

function getApiKeyName(provider: AiProvider) {
  if (provider === "groq") return "GROQ_API_KEY";
  if (provider === "openrouter") return "OPENROUTER_API_KEY";
  if (provider === "deepseek") return "DEEPSEEK_API_KEY";
  return "OPENAI_API_KEY";
}

function getEndpoint(env: Record<string, string | undefined>, provider: AiProvider) {
  if (env.HOARDLY_AI_ENDPOINT) return env.HOARDLY_AI_ENDPOINT;
  if (provider === "groq") return "https://api.groq.com/openai/v1/chat/completions";
  if (provider === "openrouter") return "https://openrouter.ai/api/v1/chat/completions";
  if (provider === "deepseek") return "https://api.deepseek.com/chat/completions";
  return "https://api.openai.com/v1/chat/completions";
}
