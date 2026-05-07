import express from "express"
import cors from "cors"

import uploadRouter from "./routes/upload.js";
import chatRouter from "./routes/chat.js";
import statusRouter from "./routes/status.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { testConnection } from "./config/qdrant.js";

const app = express();

app.use(cors({
    origin : process.env.FRONTEND_URL || "http://localhost:5173"
}))
app.use(express.json());

app.use("/api/upload" , uploadRouter)
app.use("/api/chat" ,chatRouter)
app.use("/api/status" , statusRouter)

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

await testConnection();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});