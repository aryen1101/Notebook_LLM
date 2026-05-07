import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({ baseURL: BASE_URL });

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