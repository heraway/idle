import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface JwtPayload {
  userId: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
}

export function signToken(payload: JwtPayload): string {
  // Cast avoids a TS overload mismatch between @types/jsonwebtoken's strict
  // `expiresIn` type (expects a numeric literal type) and a plain string
  // sourced from an env var — functionally correct at runtime either way.
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
