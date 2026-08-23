import { Request, Response, NextFunction, RequestHandler } from "express";

// Wraps async route handlers so thrown errors reach Express's error middleware
// instead of crashing the process or hanging the request.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
