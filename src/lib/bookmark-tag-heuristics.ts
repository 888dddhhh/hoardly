/**
 * 非 AI 的 URL/主机启发：作为多路校验之一，与 HTML/搜索证据交叉验证。
 */
export function getLocalHeuristicKeywords(url: string): string[] {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    return [];
  }

  const out: string[] = [];
  const push = (...xs: string[]) => {
    for (const x of xs) {
      if (x && !out.includes(x)) out.push(x);
    }
  };

  const u = `${host}${path}`;

  if (/outlook\.|hotmail\.|live\.com|office\.com|office365|gmail\.|google\.com\/mail|proton\.me|protonmail|163\.com|126\.com|yeah\.net|qq\.com\/mail|icloud\.com\/mail|yahoo\.com\/mail|zoho\.com\/mail|fastmail|hey\.com/i.test(u)) {
    push("email", "webmail", "mailbox");
  }
  if (/calendar\.google\.|outlook\.office\.com\/calendar|office\.com\/calendar/i.test(u)) {
    push("calendar", "scheduling", "productivity");
  }
  if (/github\.|gitlab\.|bitbucket\.|gitea\.|codeberg\./i.test(host)) {
    push("code-hosting", "version-control", "repository");
  }
  if (/stackoverflow\.|stackexchange\.|askubuntu\./i.test(host)) {
    push("qna", "developer-community", "knowledge-base");
  }
  if (/youtube\.|youtu\.be|vimeo\.|bilibili\.|twitch\./i.test(host)) {
    push("video", "streaming", "media");
  }
  if (/twitter\.|x\.com|threads\.|mastodon\.|reddit\.|facebook\.|linkedin\.com\/feed/i.test(host)) {
    push("social", "community", "networking");
  }
  if (/notion\.|confluence\.|coda\.|airtable\.|clickup\.|asana\.|trello\./i.test(host)) {
    push("workspace", "collaboration", "documentation");
  }
  if (/figma\.|canva\.|miro\.|excalidraw\./i.test(host)) {
    push("design", "visual", "prototyping");
  }
  if (/wikipedia\.|wiktionary\.|wikimedia\./i.test(host)) {
    push("encyclopedia", "reference", "reading");
  }
  if (/medium\.|substack\.|ghost\.|wordpress\.com/i.test(host)) {
    push("publishing", "articles", "blog");
  }
  if (/npmjs|pypi\.org|crates\.io|mvnrepository|nuget\.org/i.test(host)) {
    push("package-registry", "developer-tools", "dependencies");
  }
  if (/docs\.|developer\.|readthedocs|gitbook\.|mdn\.|devdocs/i.test(u)) {
    push("documentation", "developer", "reference");
  }
  if (/aws\.amazon|cloud\.google|azure\.microsoft|digitalocean|heroku|vercel|netlify|fly\.io/i.test(host)) {
    push("cloud", "hosting", "infrastructure");
  }
  if (/stripe\.|paypal\.|square\.|checkout/i.test(host)) {
    push("payments", "fintech", "commerce");
  }
  if (/shopify|amazon\.|ebay\.|etsy\.|aliexpress/i.test(host)) {
    push("ecommerce", "shopping", "retail");
  }
  if (/news\.|bbc\.|cnn\.|reuters|theguardian|nytimes/i.test(host)) {
    push("news", "journalism", "reading");
  }
  if (/arxiv\.|ieee\.|springer|sciencedirect|jstor/i.test(host)) {
    push("research", "academic", "papers");
  }
  if (/kaggle\.|colab\.research|huggingface\.|wandb\./i.test(host)) {
    push("machine-learning", "data-science", "notebooks");
  }
  if (/openai\.|anthropic\.|claude\.ai|chatgpt|deepseek|gemini\.google/i.test(host)) {
    push("llm", "ai-assistant", "chat");
  }

  return out.slice(0, 14);
}
