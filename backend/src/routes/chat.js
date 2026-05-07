import express from "express";
import { chat } from "../services/chatService.js";
import { isCollectionReady } from "../config/qdrant.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  const { query, history = [], topK = 4 } = req.body;

  if (!query?.trim()) {
    return res.status(400).json({ error: "query field is required." });
  }

  const ready = await isCollectionReady();
  if (!ready) {
    return res.status(400).json({ error: "No document indexed yet. Upload a document first." });
  }

  try {
    const result = await chat(query.trim(), history, topK);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;