import express from "express";
import { chat } from "../services/chatService.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  const { query, history = [] } = req.body;

  if (!query?.trim()) {
    return res.status(400).json({ error: "query field is required." });
  }

  try {
    const result = await chat(query.trim(), history);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;