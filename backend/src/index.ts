import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import { generalLimiter } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { verifyToken } from "./utils/jwt";
import { prisma } from "./config/prisma";

import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { jobRouter } from "./routes/job.routes";
import { bidRouter } from "./routes/bid.routes";
import { checklistRouter } from "./routes/checklist.routes";
import { messageRouter } from "./routes/message.routes";
import { questionRouter } from "./routes/question.routes";
import { ratingRouter } from "./routes/rating.routes";
import { escrowRouter } from "./routes/escrow.routes";
import { reportRouter } from "./routes/report.routes";
import { verificationRouter } from "./routes/verification.routes";
import { adminRouter } from "./routes/admin.routes";
import { accountRouter } from "./routes/account.routes";
import { supportRouter } from "./routes/support.routes";

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Chat sockets must be authenticated, and may only join the room of a job the
// user is actually part of (hirer or assigned worker). Without this, anyone who
// knew a job id could listen in on its messages.
io.use(async (socket, next) => {
  try {
    const token = (socket.handshake.auth?.token as string | undefined) || undefined;
    if (!token) return next(new Error("Authentication required"));
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.deletedAt || user.accountStatus !== "ACTIVE") return next(new Error("Account not available"));
    socket.data.userId = user.id;
    socket.data.role = user.role;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  socket.on("joinJobChat", async (jobId: string) => {
    try {
      if (typeof jobId !== "string") return;
      const userId = socket.data.userId as string;
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { hirerId: true, assignments: { select: { workerId: true } } },
      });
      const allowed = !!job && (job.hirerId === userId || job.assignments.some((a) => a.workerId === userId));
      if (!allowed) {
        socket.emit("chatError", { jobId, error: "You are not part of this job's conversation" });
        return;
      }
      socket.join(`job_${jobId}`);
    } catch {
      socket.emit("chatError", { jobId, error: "Could not join chat" });
    }
  });

  socket.on("leaveJobChat", (jobId: string) => {
    socket.leave(`job_${jobId}`);
  });
});

// Uploaded photos are loaded cross-origin (web preview, other hosts), so relax
// helmet's default same-origin resource policy.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(generalLimiter);

// Invisible portfolio signature — not shown in any UI, just an attribution
// marker on API responses so this build can be identified as the original.
app.use((_req, res, next) => {
  res.setHeader("X-Built-By", "heraway");
  next();
});

// Serve uploaded photos (before/after, checklist proof, chat images).
// Swap for S3/Cloudinary in production — see backend/.env.example.
app.use("/uploads", express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || "./uploads")));

app.get("/health", (_req, res) => res.json({ ok: true, service: "idle-backend" }));

app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/jobs", jobRouter);
app.use("/bids", bidRouter);
app.use("/checklist", checklistRouter);
app.use("/messages", messageRouter);
app.use("/questions", questionRouter);
app.use("/ratings", ratingRouter);
app.use("/escrow", escrowRouter);
app.use("/reports", reportRouter);
app.use("/verification", verificationRouter);
app.use("/admin", adminRouter);
app.use("/users", accountRouter);
app.use("/support", supportRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Idle API listening on :${PORT}`));