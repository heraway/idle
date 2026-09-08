import { ApiError } from "./ApiError";

// Deliberately small and conservative — this is a first line of defense
// against the obvious/common cases, not a full moderation system. Anything
// more nuanced (harassment, context-dependent abuse, coded language) still
// relies on the human report queue in report.routes.ts + admin dashboard.
// Swap this list (or the whole module) for a maintained package like
// "bad-words" or "leo-profanity" if you need broader/multi-language coverage.
const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "whore",
  "slut",
  "bastard",
];

const PATTERN = new RegExp(`\\b(${BLOCKED_WORDS.join("|")})\\b`, "i");

export function containsProfanity(text: string): boolean {
  return PATTERN.test(text);
}

// Call on any free-text field a user submits that other users will see
// (job posts, chat messages, Q&A, rating comments). Throws a 400 that the
// existing errorHandler already knows how to surface cleanly.
export function assertClean(text: string | null | undefined, fieldLabel = "message") {
  if (text && containsProfanity(text)) {
    throw new ApiError(400, `Please remove inappropriate language from your ${fieldLabel} before submitting.`);
  }
}
