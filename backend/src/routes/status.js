import express from "express";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const info = await qdrantClient.getCollection(COLLECTION_NAME);
    const vectorsStored = info.points_count ?? 0;
    return res.status(200).json({ ready: vectorsStored > 0, vectorsStored });
  } catch (err) {
    // Collection doesn't exist -> genuinely no document.
    if (err?.status === 404 || /not found|doesn't exist/i.test(err?.message ?? "")) {
      return res.status(200).json({ ready: false, vectorsStored: 0 });
    }
    // Anything else (Qdrant asleep/unreachable) must NOT look like "no document",
    // otherwise the UI tells the user their indexed document is missing.
    console.error("Status check failed:", err?.message);
    return res.status(503).json({ error: "Can't reach the vector database right now." });
  }
});

export default router;
