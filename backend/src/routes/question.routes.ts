import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { notifyNewQuestion, notifyQuestionAnswered } from "../services/notification.service";

export const questionRouter = Router();

const ASKER_SELECT = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;

// ------------------------------------------------------------
// LIST — public read, no auth required, so anyone browsing a job (even
// logged out) can see existing Q&A before deciding whether to bid.
// ------------------------------------------------------------
questionRouter.get(
  "/job/:jobId",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const questions = await prisma.jobQuestion.findMany({
      where: { jobId: req.params.jobId },
      orderBy: { createdAt: "asc" },
      include: { asker: { select: ASKER_SELECT } },
    });
    res.json(questions);
  })
);

// ------------------------------------------------------------
// ASK — any authenticated user except the job's own hirer (the hirer
// answers, they don't ask themselves a public question). Allowed on a job
// in any status, so late viewers of a finished job can still get context.
// ------------------------------------------------------------
const askSchema = z.object({
  jobId: z.string().uuid(),
  body: z.string().min(3).max(1000),
});

questionRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = askSchema.parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: data.jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId === req.auth!.userId) {
      throw new ApiError(400, "You posted this job — reply to a question instead of asking one");
    }

    const question = await prisma.jobQuestion.create({
      data: { jobId: data.jobId, askerId: req.auth!.userId, body: data.body },
      include: { asker: { select: ASKER_SELECT } },
    });

    await notifyNewQuestion(job.hirerId, job.title);

    res.status(201).json(question);
  })
);

// ------------------------------------------------------------
// ANSWER — only the job's hirer, and only once per question (re-answering
// just updates the existing answer rather than creating a new record).
// ------------------------------------------------------------
const answerSchema = z.object({
  answerBody: z.string().min(1).max(1000),
});

questionRouter.patch(
  "/:id/answer",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = answerSchema.parse(req.body);
    const question = await prisma.jobQuestion.findUnique({
      where: { id: req.params.id },
      include: { job: true },
    });
    if (!question) throw new ApiError(404, "Question not found");
    if (question.job.hirerId !== req.auth!.userId) {
      throw new ApiError(403, "Only the job's poster can answer this question");
    }

    const updated = await prisma.jobQuestion.update({
      where: { id: question.id },
      data: { answerBody: data.answerBody, answeredAt: new Date() },
      include: { asker: { select: ASKER_SELECT } },
    });

    await notifyQuestionAnswered(question.askerId, question.job.title);

    res.json(updated);
  })
);
