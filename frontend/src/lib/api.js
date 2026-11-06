import axios from "axios";

const BASE_URL = (
  import.meta.env.VITE_API_URL || "https://notebook-llm-2.onrender.com"
).replace(/\/$/, "");

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
  if (cfg && isColdStart && !cfg._retried) {
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