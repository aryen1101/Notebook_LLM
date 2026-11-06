import express from "express"
import cors from "cors"

import uploadRouter from "./routes/upload.js";
import chatRouter from "./routes/chat.js";
import statusRouter from "./routes/status.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { testConnection } from "./config/qdrant.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://notebook-llm-sigma.vercel.app",
  process.env.FRONTEND_URL?.trim(),
  ...(process.env.FRONTEND_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests (curl, server-to-server) with no Origin header.
    if (!origin) return callback(null, true);
    // Allow listed origins and any Vercel preview deployment of this project.
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);
app.use("/api/status", statusRouter);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`Server is active on port ${PORT}`);
  try {
    await testConnection();
  } catch (e) {
    console.error("Database connection issue:", e);
  }
});

server.on("error", (err) => {
  console.error("HTTP server error:", err.message);
});
