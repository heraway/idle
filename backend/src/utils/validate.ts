import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "./ApiError";

/**
 * Validates req.body against a Zod schema and replaces req.body with the
 * parsed (and therefore type-narrowed) result. Keeps every route handler
 * free of manual "if (!x) throw" boilerplate.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return next(new ApiError(400, message));
    }
    req.body = result.data;
    next();
  };
}
