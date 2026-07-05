export interface GoogleAccount {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export const ADMIN_GOOGLE_EMAIL = "UXIOI";

export function isAdminAccount(account: GoogleAccount | null) {
  return Boolean(account?.email && account.email === ADMIN_GOOGLE_EMAIL);
}
