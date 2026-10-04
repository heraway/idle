import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { supportLimiter } from "../middleware/rateLimit";

// Settings > Report a problem / Report a bug / Send feedback all post here.
// (Reporting a *user* goes through the existing /reports endpoint instead.)
export const supportRouter = Router();

const ticketSchema = z.object({
  type: z.enum(["PROBLEM", "BUG", "FEEDBACK"]),
  category: z.string().trim().max(50).optional(),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000),
  appVersion: z.string().max(50).optional(),
  platform: z.string().max(20).optional(),
  osVersion: z.string().max(50).optional(),
  runtimeVersion: z.string().max(50).optional(),
});

supportRouter.post(
  "/",
  requireAuth,
  supportLimiter,
  asyncHandler(async (req, res) => {
    const data = ticketSchema.parse(req.body);
    const ticket = await prisma.supportTicket.create({
      data: { ...data, category: data.category || null, userId: req.auth!.userId },
      select: { id: true, type: true, createdAt: true },
    });
    res.status(201).json(ticket);
  })
);

// Admin: read the inbox (optionally ?type=BUG&status=OPEN).
supportRouter.get(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const tickets = await prisma.supportTicket.findMany({
      where: { ...(type ? { type } : {}), ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    res.json(tickets);
  })
);
