import express from "express";
import { isCollectionReady, qdrantClient, COLLECTION_NAME } from "../config/qdrant.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const ready = await isCollectionReady();
    let vectorsStored = 0;

    if (ready) {
      const info = await qdrantClient.getCollection(COLLECTION_NAME);
      vectorsStored = info.points_count ?? 0;
    }

    return res.status(200).json({ ready, vectorsStored });
  } catch {
    return res.status(200).json({ ready: false, vectorsStored: 0 });
  }
});

export default router;