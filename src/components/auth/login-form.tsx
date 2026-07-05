import type { ComponentProps } from "react";
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

export type LoginFormProps = ComponentProps<"div"> & {
  onGoogleSignIn: () => void;
  onRequestSignUp: () => void;
  onCredentialSubmit?: () => void;
  emailPasswordNotice?: string | null;
};

export function LoginForm({
  className,
  onGoogleSignIn,
  onRequestSignUp,
  onCredentialSubmit,
  emailPasswordNotice,
  ...props
}: LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border bg-card text-card-foreground shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle>登录账户</CardTitle>
          <CardDescription>使用邮箱登录，或通过 Google 继续。</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onCredentialSubmit?.();
            }}
          >
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel htmlFor="login-email">邮箱</FieldLabel>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                />
              </Field>
              <Field>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel htmlFor="login-password">密码</FieldLabel>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    忘记密码？
                  </button>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                />
              </Field>
              {emailPasswordNotice ? (
                <FieldError>{emailPasswordNotice}</FieldError>
              ) : null}
              <Field className="gap-3">
                <Button className="w-full" size="lg" type="submit">
                  登录
                </Button>
                <Button
                  className="w-full gap-2"
                  size="lg"
                  type="button"
                  variant="outline"
                  onClick={onGoogleSignIn}
                >
                  <Icon icon={GoogleIcon} className="size-5" />
                  使用 Google 登录
                </Button>
                <FieldDescription className="text-center">
                  还没有账户？{" "}
                  <button
                    type="button"
                    className="text-foreground underline-offset-4 hover:underline"
                    onClick={onRequestSignUp}
                  >
                    注册
                  </button>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
