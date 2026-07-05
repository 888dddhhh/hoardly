import { useState } from "react";
import { ShieldCheck as ShieldUserIcon } from "lucide-react";

import { LoginForm } from "./auth/login-form";
import { SignupForm } from "./auth/signup-form";
import { Icon } from "./ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const EMAIL_AUTH_NOTICE =
  "本构建仅接入 Google 账号。请使用下方「使用 Google」按钮完成登录或注册。";

export function AuthPanel({
  compact = false,
  onAuthenticated,
}: {
  compact?: boolean;
  onAuthenticated: () => void;
}) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [emailPasswordNotice, setEmailPasswordNotice] = useState<string | null>(
    null,
  );

  const handleGoogle = () => {
    setEmailPasswordNotice(null);
    onAuthenticated();
  };

  return (
    <div
      className={
        compact
          ? "flex max-h-[min(520px,calc(100vh-120px))] w-full flex-col gap-4 overflow-y-auto"
          : "flex w-full max-w-sm flex-col gap-6"
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <img alt="Hoardly" className="size-10 rounded-xl" src="/hoardly-logo.png" />
        </div>
        <p className="text-sm text-muted-foreground">
          账户、套餐与管理员权限与 Google 绑定。
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as "login" | "signup");
          setEmailPasswordNotice(null);
        }}
        className="gap-4"
      >
        <TabsList className="grid h-10 w-full grid-cols-2">
          <TabsTrigger value="login">登录</TabsTrigger>
          <TabsTrigger value="signup">注册</TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="mt-0">
          <LoginForm
            onCredentialSubmit={() => setEmailPasswordNotice(EMAIL_AUTH_NOTICE)}
            onGoogleSignIn={handleGoogle}
            onRequestSignUp={() => {
              setTab("signup");
              setEmailPasswordNotice(null);
            }}
            emailPasswordNotice={emailPasswordNotice}
          />
        </TabsContent>
        <TabsContent value="signup" className="mt-0">
          <SignupForm
            onCredentialSubmit={() => setEmailPasswordNotice(EMAIL_AUTH_NOTICE)}
            onGoogleSignIn={handleGoogle}
            onRequestSignIn={() => {
              setTab("login");
              setEmailPasswordNotice(null);
            }}
            emailPasswordNotice={emailPasswordNotice}
          />
        </TabsContent>
      </Tabs>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
        <Icon icon={ShieldUserIcon} className="mt-0.5 size-4 shrink-0" />
        <p>
          本版本不提供邮箱密码、通行密钥或微信登录；界面保留表单以便与产品流程对齐。
        </p>
      </div>
    </div>
  );
}
