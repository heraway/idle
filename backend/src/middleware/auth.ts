import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../config/prisma";

// Extend Express's Request type with the authenticated user payload.
declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or malformed Authorization header"));
  }
  try {
    const token = header.split(" ")[1];
    const payload = verifyToken(token);

    // Re-check account status on every request so a banned/suspended user's
    // existing token is immediately worthless, not just at login time.
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return next(new ApiError(401, "User no longer exists"));
    if (user.accountStatus === "BANNED") return next(new ApiError(403, "This account has been banned"));
    if (user.accountStatus === "SUSPENDED") return next(new ApiError(403, "This account is suspended"));

    req.auth = payload;
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || (req.auth.role !== "ADMIN" && req.auth.role !== "SUPERADMIN")) {
    return next(new ApiError(403, "Admin privileges required"));
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role !== "SUPERADMIN") {
    return next(new ApiError(403, "Super-admin privileges required"));
  }
  next();
}

// Like requireAuth, but never blocks the request — used on public browsing
// routes (job search/detail) where we still want to know *who's* asking, so
// we can show full details to participants/admins and a privacy-safe view
// to everyone else. Silently ignores a missing or invalid token.
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next();
  try {
    const token = header.split(" ")[1];
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (user && user.accountStatus === "ACTIVE") req.auth = payload;
  } catch {
    // Invalid/expired token on a public route — just proceed unauthenticated.
  }
  next();
}
