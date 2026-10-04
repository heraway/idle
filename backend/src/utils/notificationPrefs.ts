// Per-user push notification preferences, stored as JSON on User.notificationPrefs.
// A missing key means "on", so existing users keep getting everything until they opt out.
export const NOTIFICATION_CATEGORIES = ["bids", "jobs", "questions"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface NotificationPrefs {
  push: boolean; // master switch
  bids: boolean; // new bid on your job, your bid accepted
  jobs: boolean; // job marked complete, job cancelled
  questions: boolean; // new question on your job, your question answered
}

export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "pt"] as const;

export function resolvePrefs(raw: unknown): NotificationPrefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pick = (k: string) => (typeof o[k] === "boolean" ? (o[k] as boolean) : true);
  return { push: pick("push"), bids: pick("bids"), jobs: pick("jobs"), questions: pick("questions") };
}
