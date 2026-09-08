import rateLimit from "express-rate-limit";

// Generous general limit + a tighter one for auth endpoints to blunt
// credential-stuffing / brute-force attempts.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts, please try again later." },
});

// Reports are cheap to file and can be weaponized as harassment (e.g.
// spamming reports against one user to get them auto-flagged). Keyed by
// the authenticated user, not IP, since this sits after requireAuth — so
// it limits per-account, which is what actually matters for this abuse
// pattern (an attacker on one IP could otherwise just use one account
// anyway, but this also protects against a compromised/malicious account
// on a shared IP hitting the general limiter's higher ceiling instead).
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.auth?.userId || req.ip,
  message: { error: "You've filed a lot of reports recently. Please try again later." },
});
