import axios from "axios";

const BASE_URL = (
  import.meta.env.VITE_API_URL || "https://notebook-llm-2.onrender.com"
).replace(/\/$/, "");

export const API_BASE_URL = BASE_URL;

// Render's free tier spins the backend down after inactivity; the first request
// can take ~30-60s to wake it. Give requests a generous timeout and retry once
// on network/timeout errors so a cold start doesn't surface as a failed request.
const api = axios.create({ baseURL: BASE_URL, timeout: 90000 });

api.interceptors.response.use(undefined, async (error) => {
  const cfg = error.config;
  const isColdStart =
    error.code === "ECONNABORTED" || // timeout
    error.code === "ERR_NETWORK" || // no response (server waking / no CORS headers)
    !error.response;
  // Never auto-retry uploads: if the first request timed out it is usually
  // still ingesting on the server, and a second one would wipe it mid-way.
  if (cfg && isColdStart && !cfg._retried && !cfg.noRetry) {
    cfg._retried = true;
    return api(cfg);
  }
  return Promise.reject(error);
});

export async function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append("document", file);
  const { data } = await api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    // Embedding a large PDF on a CPU-only server can take several minutes.
    timeout: 10 * 60 * 1000,
    noRetry: true,
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return data;
}

export async function sendChat(query, history = []) {
  const { data } = await api.post("/api/chat", { query, history });
  return data;
}

export async function getStatus() {
  const { data } = await api.get("/api/status");
  return data;
}

export async function deleteDocument() {
  const { data } = await api.delete("/api/upload");
  return data;
}