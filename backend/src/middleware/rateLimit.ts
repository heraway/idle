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
