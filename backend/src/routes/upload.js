import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ingestDocument } from "../services/ingestionService.js";

const router = express.Router();

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_"); // fix 1: was "basename", should be "base"
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".pdf", ".txt", ".csv"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, and CSV files are supported."));
    }
  },
});

router.post("/", upload.single("document"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");

  try {
    const stats = await ingestDocument(filePath, ext);
    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "Document ingested successfully.", ...stats });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    next(err);
  }
});

export default router;