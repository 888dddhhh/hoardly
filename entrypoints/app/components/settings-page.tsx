import { useState } from "react";
import {
  Settings as Settings02Icon,
  Shield as Shield01Icon,
  Wallet as Wallet01Icon,
  Key as Key02Icon,
} from "lucide-react";
import { Button } from "../../../src/components/ui/button";
import { Card, CardContent, CardHeader } from "../../../src/components/ui/card";
import { Separator } from "../../../src/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "../../../src/components/ui/tabs";
import { Icon, type IconSvgElement } from "../../../src/components/ui/icon";
import { Input } from "../../../src/components/ui/input";
import { testAiConnectionWithSettings } from "../../../src/lib/ai-client";
import {
  loadAiUserSettings,
  normalizeAiUserSettings,
  OPENROUTER_MODEL_OPTIONS,
  saveAiUserSettings,
  type AiUserSettings,
} from "../../../src/lib/ai-user-settings";
import { mockAccount } from "../../../src/lib/mock-data";
import { PLAN_DEFINITIONS } from "../../../src/types/billing";
import { DEFAULT_DEFINE_ALL_SETTINGS } from "../../../src/types/settings";
import { SettingRow } from "./shared";

type SettingsNavId = "preferences" | "security" | "payment" | "ai";
type AiTestState = "idle" | "testing" | "success" | "error";

const AI_PROVIDER_OPTIONS: Array<{ id: AiUserSettings["provider"]; label: string }> = [
  { id: "openrouter", label: "OpenRouter" },
  { id: "groq", label: "Groq" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "openai", label: "OpenAI" },
];

function areAiSettingsSame(a: AiUserSettings | null, b: AiUserSettings | null) {
  if (!a || !b) return false;
  return JSON.stringify(normalizeAiUserSettings(a)) === JSON.stringify(normalizeAiUserSettings(b));
}

export function SettingsPage() {
  const [nav, setNav] = useState<SettingsNavId>("ai");
  const [paymentTab, setPaymentTab] = useState<"crypto" | "card" | "wallet">("crypto");
  const [twoFactorHint, setTwoFactorHint] = useState<string | null>(null);

  const [savedAi, setSavedAi] = useState<AiUserSettings>(() => loadAiUserSettings());
  const [ai, setAi] = useState<AiUserSettings>(() => loadAiUserSettings());
  const [testedAi, setTestedAi] = useState<AiUserSettings | null>(null);
  const [aiTestState, setAiTestState] = useState<AiTestState>("idle");
  const [aiHint, setAiHint] = useState<string | null>(null);

  const selectedOpenRouterModel = OPENROUTER_MODEL_OPTIONS.some((item) => item.value === ai.model)
    ? ai.model
    : "custom";
  const aiMatchesSuccessfulTest = areAiSettingsSame(ai, testedAi) && aiTestState === "success";
  const aiHasUnsavedChanges = !areAiSettingsSame(ai, savedAi);

  const updateAiDraft = (patch: Partial<AiUserSettings>) => {
    setAi((prev) => normalizeAiUserSettings({ ...prev, ...patch }));
    setTestedAi(null);
    setAiTestState("idle");
    setAiHint(null);
  };

  const testAi = async () => {
    setAiHint(null);
    setAiTestState("testing");
    const draft = normalizeAiUserSettings({
      ...ai,
      useCustomApi: true,
    });
    setAi(draft);
    try {
      const result = await testAiConnectionWithSettings(draft);
      setTestedAi(draft);
      setAiTestState("success");
      setAiHint(`测试成功：${result.provider} / ${result.model}。现在可以保存并生效。`);
    } catch (error) {
      setTestedAi(null);
      setAiTestState("error");
      setAiHint(error instanceof Error ? error.message : "连接失败");
    }
  };

  const saveTestedAi = () => {
    if (!aiMatchesSuccessfulTest || !testedAi) {
      setAiHint("请先测试当前填写的 API、Base URL 和模型 ID；测试成功后才能保存生效。");
      return;
    }
    const next = saveAiUserSettings(testedAi);
    setSavedAi(next);
    setAi(next);
    setTestedAi(next);
    setAiTestState("success");
    setAiHint(`已保存并生效：${next.provider} / ${next.model}`);
  };

  return (
    <div className="flex min-h-0 flex-col gap-6 lg:flex-row">
      {/* Settings navigation */}
      <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-52 lg:flex-col lg:gap-1 lg:border-r lg:border-border lg:pr-4">
        <NavButton active={nav === "preferences"} icon={Settings02Icon} label="偏好与账户" onClick={() => setNav("preferences")} />
        <NavButton active={nav === "security"} icon={Shield01Icon} label="安全" onClick={() => setNav("security")} />
        <NavButton active={nav === "payment"} icon={Wallet01Icon} label="支付与订阅" onClick={() => setNav("payment")} />
        <NavButton active={nav === "ai"} icon={Key02Icon} label="AI API" onClick={() => setNav("ai")} />
      </nav>

      <div className="min-w-0 flex-1 space-y-6">
        {nav === "preferences" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">偏好与账户</h2>
                <p className="text-sm text-muted-foreground">
                  展示信息与 H5 预览对齐；扩展内主题请用左侧栏月亮图标切换。
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <SettingRow label="账号" value={mockAccount.displayName} />
                <SettingRow label="邮箱" value={mockAccount.googleEmail} />
                <SettingRow label="界面语言" value={DEFAULT_DEFINE_ALL_SETTINGS.personal.language} />
                <SettingRow label="每日复查" value={DEFAULT_DEFINE_ALL_SETTINGS.personal.dailyReviewTime} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">DefineAll 总览</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <SettingRow label="自动整理" value={DEFAULT_DEFINE_ALL_SETTINGS.personal.autoMoveMode} />
                <SettingRow label="失效检测" value="已启用" />
                <SettingRow label="计费资产" value="USDT / USDC（Polygon）" />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {nav === "security" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">安全设定</h2>
                <p className="text-sm text-muted-foreground">
                  以下为产品内模块占位；敏感操作仍以浏览器与 Google 账号为准。
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">两步验证（2FA）</p>
                    <p className="text-xs text-muted-foreground">启用后敏感设置需二次确认（演示）。</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTwoFactorHint("已记录偏好（扩展本地演示，未连接服务端）。");
                    }}
                  >
                    配置指南
                  </Button>
                </div>
                {twoFactorHint ? <p className="text-xs text-muted-foreground">{twoFactorHint}</p> : null}
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">活跃会话</p>
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    本机 Chrome 扩展 · 当前设备 · 刚刚
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">数据导出</p>
                  <Button type="button" variant="secondary" disabled title="后续可对接导出 chrome.storage 元数据">
                    导出书签元数据（即将推出）
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {nav === "payment" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">支付与订阅</h2>
                <p className="text-sm text-muted-foreground">
                  当前方案：<strong className="text-foreground">{PLAN_DEFINITIONS.free.name}</strong>
                  。以下为收款与方式说明模块（演示数据）。
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  defaultValue="crypto"
                  onValueChange={(val) => setPaymentTab(val as "crypto" | "card" | "wallet")}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="crypto" className="flex-1">链上</TabsTrigger>
                    <TabsTrigger value="card" className="flex-1">银行卡</TabsTrigger>
                    <TabsTrigger value="wallet" className="flex-1">钱包</TabsTrigger>
                  </TabsList>
                </Tabs>

                {paymentTab === "crypto" ? (
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon icon={Wallet01Icon} className="size-4" />
                      Polygon USDT / USDC
                    </div>
                    <p className="text-xs text-muted-foreground">
                      演示收款地址（勿向此地址打款）：{" "}
                      <code className="break-all rounded-md border border-border bg-muted px-1.5 py-0.5 text-foreground">
                        0xA1b2C3d4E5f6HoardlyPolygonWallet
                      </code>
                    </p>
                    <SettingRow label="月付" value="$5 / 月" />
                    <SettingRow label="终身" value="$120 一次性" />
                  </div>
                ) : null}
                {paymentTab === "card" ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    银行卡代扣与发票信息可在此配置（对接支付网关前为占位）。
                  </div>
                ) : null}
                {paymentTab === "wallet" ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    连接 Web3 钱包、查看链上支付记录（占位）。
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">权益</h2>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>订阅状态与 AI 调用额度将显示于此；扩展当前为本地 API 模式时可忽略计费。</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {nav === "ai" ? (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">AI API</h2>
              <p className="text-sm text-muted-foreground">
                先填写并测试当前草稿；只有测试成功后，点击保存才会写入后台并让打标任务生效。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>
                  当前生效：<span className="text-foreground">{savedAi.provider}</span>{" "}
                  / <span className="break-all text-foreground">{savedAi.model}</span>
                </p>
                <p>
                  {aiHasUnsavedChanges
                    ? "下面有未保存草稿，后台仍使用上面的生效配置。"
                    : "草稿与当前生效配置一致。"}
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <span className="relative inline-flex size-5 items-center justify-center">
                  <input
                    checked={ai.useCustomApi}
                    type="checkbox"
                    className="peer size-4 cursor-pointer appearance-none rounded-md border border-input bg-input/30 transition-colors checked:border-primary checked:bg-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    onChange={(event) => updateAiDraft({ useCustomApi: event.target.checked })}
                  />
                  <svg
                    className="pointer-events-none absolute inset-0 m-auto size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 8.5l3.5 3.5 6.5-7" />
                  </svg>
                </span>
                使用自己的 API Key（保存后生效）
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs">
                  <span className="text-muted-foreground">供应商</span>
                  <select
                    className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={ai.provider}
                    onChange={(event) => {
                      const provider = event.target.value as AiUserSettings["provider"];
                      updateAiDraft({
                        provider,
                        baseUrl: provider === "openrouter" ? "https://openrouter.ai/api/v1" : ai.baseUrl,
                      });
                    }}
                  >
                    {AI_PROVIDER_OPTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs">
                  <span className="text-muted-foreground">Base URL</span>
                  <Input value={ai.baseUrl} onChange={(event) => updateAiDraft({ baseUrl: event.target.value })} />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs">
                  <span className="text-muted-foreground">模型快捷选择</span>
                  <select
                    className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={selectedOpenRouterModel}
                    onChange={(event) => {
                      const model = event.target.value;
                      if (model === "custom") return;
                      updateAiDraft({
                        provider: "openrouter",
                        baseUrl: "https://openrouter.ai/api/v1",
                        model,
                      });
                    }}
                  >
                    {OPENROUTER_MODEL_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                    <option value="custom">自定义模型 ID</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs">
                  <span className="text-muted-foreground">模型 ID</span>
                  <Input value={ai.model} onChange={(event) => updateAiDraft({ model: event.target.value })} />
                </label>
              </div>
              <label className="grid gap-1.5 text-xs">
                <span className="text-muted-foreground">API Key</span>
                <Input
                  autoComplete="off"
                  type="password"
                  value={ai.apiKey}
                  onChange={(event) => updateAiDraft({ apiKey: event.target.value })}
                />
              </label>
              <Separator />
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">严格打标数据源</p>
                  <p className="text-xs text-muted-foreground">
                    新增书签会先走 Jina Reader，再走 Firecrawl 或 Crawl4AI，并用 AI 做最终交叉验证。
                  </p>
                </div>
                <label className="grid gap-1.5 text-xs">
                  <span className="text-muted-foreground">Jina API Key（可选）</span>
                  <Input
                    autoComplete="off"
                    type="password"
                    value={ai.jinaApiKey}
                    onChange={(event) => updateAiDraft({ jinaApiKey: event.target.value })}
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs">
                    <span className="text-muted-foreground">Firecrawl API Key</span>
                    <Input
                      autoComplete="off"
                      type="password"
                      value={ai.firecrawlApiKey}
                      onChange={(event) => updateAiDraft({ firecrawlApiKey: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs">
                    <span className="text-muted-foreground">Firecrawl Scrape URL</span>
                    <Input
                      value={ai.firecrawlApiUrl}
                      onChange={(event) => updateAiDraft({ firecrawlApiUrl: event.target.value })}
                    />
                  </label>
                </div>
                <label className="grid gap-1.5 text-xs">
                  <span className="text-muted-foreground">Crawl4AI Endpoint（Firecrawl 不可用时使用）</span>
                  <Input
                    value={ai.crawl4AiEndpoint}
                    onChange={(event) => updateAiDraft({ crawl4AiEndpoint: event.target.value })}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={aiTestState === "testing"}
                  onClick={() => void testAi()}
                >
                  {aiTestState === "testing" ? "测试中…" : "测试当前 API"}
                </Button>
                <Button type="button" variant="outline" disabled={!aiMatchesSuccessfulTest} onClick={saveTestedAi}>
                  保存并生效
                </Button>
              </div>
              {aiHint ? (
                <p
                  className={`text-xs ${
                    aiTestState === "success" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {aiHint}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: IconSvgElement;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="w-full justify-start gap-2"
      onClick={onClick}
    >
      <Icon icon={icon} className="size-4 shrink-0" />
      {label}
    </Button>
  );
}
