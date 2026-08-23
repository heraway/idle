import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { generalLimiter } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";

import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { jobRouter } from "./routes/job.routes";
import { bidRouter } from "./routes/bid.routes";
import { checklistRouter } from "./routes/checklist.routes";
import { messageRouter } from "./routes/message.routes";
import { ratingRouter } from "./routes/rating.routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(generalLimiter);

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
app.use("/ratings", ratingRouter);

// NOTE: escrow, reports, id-verification, and admin routers are being added
// next — they'll mount here as /escrow, /reports, /verification, /admin.

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Idle API listening on :${PORT}`));
