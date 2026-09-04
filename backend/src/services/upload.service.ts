import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiError } from "../utils/ApiError";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    // Mobile clients don't always report a reliable mimetype for locally
    // picked/captured photos (can come through empty or as
    // application/octet-stream) — fall back to checking the file extension
    // rather than rejecting a perfectly good photo on that alone. Using
    // ApiError here (instead of a plain Error) means the real reason
    // reaches the app instead of getting flattened into a generic
    // "Internal server error" if this ever does legitimately reject a file.
    const ext = path.extname(file.originalname).toLowerCase();
    const looksLikeImage = ALLOWED_MIME.includes(file.mimetype) || ALLOWED_EXT.includes(ext);
    if (!looksLikeImage) {
      return cb(new ApiError(400, "Only JPEG, PNG, WEBP, or HEIC images are allowed") as any);
    }
    cb(null, true);
  },
});

export function publicUrlFor(filename: string) {
  const base = process.env.PUBLIC_BASE_URL || "http://localhost:4000";
  return `${base}/uploads/${filename}`;
}
