export interface AdminDashboardMetrics {
  dailyRevenueUsd: number;
  monthlySubscribers: number;
  lifetimeUsers: number;
  activeUsers: number;
  aiCallsToday: number;
  invalidLinksDetected: number;
  errorRate: number;
}

export interface AdminConfigItem {
  key: string;
  label: string;
  value: string;
  editable: boolean;
}
