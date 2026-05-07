import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ingestDocument } from "../services/ingestionService.js";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
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
  const ext      = path.extname(req.file.originalname).toLowerCase().replace(".", "");

  try {
    const stats = await ingestDocument(filePath, ext);
    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "Document ingested successfully.", ...stats });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    next(err);
  }
});

router.delete("/", async (_req, res) => {
  try {
    const { collections } = await qdrantClient.getCollections();
    const exists = collections.some((c) => c.name === COLLECTION_NAME);
    if (exists) await qdrantClient.deleteCollection(COLLECTION_NAME);
    return res.status(200).json({ message: "Document removed." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;