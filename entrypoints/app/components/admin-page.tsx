import { Card, CardContent, CardHeader } from "../../../src/components/ui/card";
import { mockAdminMetrics } from "../../../src/lib/mock-data";
import { MetricCard, SettingRow } from "./shared";

export function AdminPage() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Revenue today" value={`$${mockAdminMetrics.dailyRevenueUsd}`} />
        <MetricCard label="Subscribers" value={mockAdminMetrics.monthlySubscribers.toString()} />
        <MetricCard label="Lifetime users" value={mockAdminMetrics.lifetimeUsers.toString()} />
        <MetricCard label="AI calls today" value={mockAdminMetrics.aiCallsToday.toString()} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground">独立的总体管理页面，只允许指定 Google 管理员邮箱访问。</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingRow label="Active users" value={mockAdminMetrics.activeUsers.toString()} />
            <SettingRow label="Invalid links detected" value={mockAdminMetrics.invalidLinksDetected.toString()} />
            <SettingRow label="Error rate" value={`${mockAdminMetrics.errorRate * 100}%`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Platform configuration</h2>
            <p className="text-sm text-muted-foreground">管理收款地址、价格、模型限流、平台参数和审计记录。</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingRow label="Payment network" value="Polygon PoS" />
            <SettingRow label="Assets" value="USDT / USDC" />
            <SettingRow label="Admin auth" value="Google UXIOI only" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
