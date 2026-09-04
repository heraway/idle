import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { ApiError } from "../utils/ApiError";

// Anything that isn't an ApiError used to fall straight through to a bare
// "Internal server error" — including validation failures, which meant a
// simple "description too short" mistake looked identical to an actual
// server crash from the user's point of view, with the real reason only
// visible in this process's own console. Now the common, expected failure
// modes (bad input, bad upload) get a real message; only truly unexpected
// errors still get logged server-side and shown as a generic 500.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    const first = err.issues[0];
    const message = first ? `${first.path.join(".") || "value"}: ${first.message}` : "Invalid request";
    return res.status(400).json({ error: message, issues: err.issues });
  }

  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "That file is too large (max 8MB)" : err.message || "Upload failed";
    return res.status(400).json({ error: message });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
