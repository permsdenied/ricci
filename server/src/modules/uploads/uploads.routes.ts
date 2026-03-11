import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { authMiddleware } from "../../common/middlewares/auth";
import { AppError } from "../../common/errors/app-error";

const router = Router();

// ── Allowed MIME types with magic byte signatures ──────────────────────────────

type AllowedMime =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/pdf"
  | "video/mp4";

const MIME_TO_EXT: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
};

/**
 * Detect real MIME type by reading magic bytes from the buffer.
 * Returns null if the type is not allowed or unrecognized.
 */
function detectMime(buf: Buffer): AllowedMime | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";

  // GIF87a / GIF89a: 47 49 46 38 37|39 61
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) return "image/gif";

  // WebP: RIFF????WEBP  (52 49 46 46 .. .. .. .. 57 45 42 50)
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";

  // PDF: %PDF  (25 50 44 46)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";

  // MP4 / MOV: ftyp box at offset 4  (66 74 79 70)
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return "video/mp4";

  return null;
}

// ── Multer: memory storage, 20 MB limit ───────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// ── POST /api/uploads ─────────────────────────────────────────────────────────

router.post(
  "/",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw AppError.badRequest("No file provided");
      }

      const { buffer, originalname } = req.file;

      // 1. Validate by magic bytes (not by extension/content-type header)
      const detectedMime = detectMime(buffer);
      if (!detectedMime) {
        throw AppError.badRequest(
          "File type not allowed. Supported: JPEG, PNG, GIF, WebP, PDF, MP4",
        );
      }

      // 2. Generate SHA-256 hash of file content as filename
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");
      const ext = MIME_TO_EXT[detectedMime];
      const filename = `${hash}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      // 3. Write to disk (skip if already exists — same content = same hash)
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        fs.writeFileSync(filePath, buffer);
      }

      const url = `/uploads/${filename}`;
      res.json({ success: true, data: { url, mime: detectedMime, originalname } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
