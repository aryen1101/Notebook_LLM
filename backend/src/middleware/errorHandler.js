export function errorHandler(err, _req, res, _next) {
  console.error("Server error:", err.message);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Max size is 20 MB." });
  }
  if (err.message?.includes("Only PDF")) {
    return res.status(415).json({ error: err.message });
  }
  if (err.message?.includes("ECONNREFUSED")) {
    return res.status(503).json({ error: "Cannot connect to Qdrant. Is it running?" });
  }

  return res.status(err.status || 500).json({
    error: err.message || "An unexpected error occurred.",
  });
}