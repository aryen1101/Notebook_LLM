import express from "express"
import cors from "cors"

import uploadRouter from "./routes/upload.js";
import chatRouter from "./routes/chat.js";
import statusRouter from "./routes/status.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { testConnection } from "./config/qdrant.js";

const app = express();

app.use(cors({
  origin: "https://notebook-llm-sigma.vercel.app"
}));

app.use(express.json());

app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);
app.use("/api/status", statusRouter);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server is active on port ${PORT}`);
  try {
    await testConnection();
  } catch (e) {
    console.error("Database connection issue:", e);
  }
});