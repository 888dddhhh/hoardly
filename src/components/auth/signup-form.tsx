import { useState, type ComponentProps } from "react";
import { Mail as GoogleIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { Icon } from "../ui/icon";
import { Input } from "../ui/input";

export type SignupFormProps = ComponentProps<typeof Card> & {
  onGoogleSignIn: () => void;
  onRequestSignIn: () => void;
  onCredentialSubmit?: () => void;
  emailPasswordNotice?: string | null;
};

export function SignupForm({
  className,
  onGoogleSignIn,
  onRequestSignIn,
  onCredentialSubmit,
  emailPasswordNotice,
  ...props
}: SignupFormProps) {
  const [passwordError, setPasswordError] = useState<string | null>(null);

  return (
    <Card
      className={cn(
        "border-border bg-card text-card-foreground shadow-xl",
        className,
      )}
      {...props}
    >
      <CardHeader className="space-y-2">
        <CardTitle>创建账户</CardTitle>
        <CardDescription>填写信息注册，或通过 Google 一键继续。</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const password = (
              form.elements.namedItem("password") as HTMLInputElement
            )?.value;
            const confirm = (
              form.elements.namedItem("confirm-password") as HTMLInputElement
            )?.value;
            if (password.length > 0 && password.length < 8) {
              setPasswordError("密码至少 8 位。");
              return;
            }
            if (password !== confirm) {
              setPasswordError("两次输入的密码不一致。");
              return;
            }
            setPasswordError(null);
            onCredentialSubmit?.();
          }}
        >
          <FieldGroup className="gap-6">
            <Field>
              <FieldLabel htmlFor="signup-name">姓名</FieldLabel>
              <Input
                id="signup-name"
                name="name"
                type="text"
                placeholder="张三"
                autoComplete="name"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-email">邮箱</FieldLabel>
              <Input
                id="signup-email"
                name="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
              />
              <FieldDescription>
                用于通知与账户安全，不会向第三方出售你的邮箱。
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-password">密码</FieldLabel>
              <Input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
              />
              <FieldDescription>至少 8 个字符。</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-confirm-password">
                确认密码
              </FieldLabel>
              <Input
                id="signup-confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
              />
            </Field>
            {passwordError ? <FieldError>{passwordError}</FieldError> : null}
            {emailPasswordNotice ? (
              <FieldError>{emailPasswordNotice}</FieldError>
            ) : null}
            <Field className="gap-3">
              <Button className="w-full" size="lg" type="submit">
                创建账户
              </Button>
              <Button
                className="w-full gap-2"
                size="lg"
                type="button"
                variant="outline"
                onClick={onGoogleSignIn}
              >
                <Icon icon={GoogleIcon} className="size-5" />
                使用 Google 注册
              </Button>
              <FieldDescription className="px-1 text-center">
                已有账户？{" "}
                <button
                  type="button"
                  className="text-foreground underline-offset-4 hover:underline"
                  onClick={onRequestSignIn}
                >
                  登录
                </button>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
