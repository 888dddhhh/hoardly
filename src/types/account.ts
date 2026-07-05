import type { PlanId } from "./billing";

export interface UserAccount {
  id: string;
  googleEmail: string;
  displayName: string;
  avatarUrl?: string;
  planId: PlanId;
  bookmarkCount: number;
  subscriptionEndsAt?: string;
  lifetimeUnlocked: boolean;
  status: "active" | "deleting" | "deleted";
}

export interface AccountDeletionRequest {
  userId: string;
  requestedAt: string;
  confirmationText: "DELETE";
  releaseAccount: boolean;
}
