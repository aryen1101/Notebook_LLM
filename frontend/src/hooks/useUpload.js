import { useCallback, useEffect, useRef, useState } from "react";
import { uploadDocument } from "../lib/api";
import { describeRequestError, fileExtension, validateFile } from "../lib/format";

/**
 * Upload state machine driven only by real signals:
 *  - "uploading": browser upload progress events (real %)
 *  - "processing": bytes sent, waiting for the server to finish extraction,
 *    chunking, embedding and vector storage (one request, no per-step events)
 *  - "error": with the stage that failed and the server's message
 * Success hands the server's response to onSuccess and returns to "idle".
 */
export function useUpload(onSuccess) {
  const [state, setState] = useState({ phase: "idle" });
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const start = useCallback(async (file) => {
    const meta = { name: file?.name ?? "", size: file?.size, ext: fileExtension(file?.name) };
    const invalid = validateFile(file);
    if (invalid) {
      setState({ phase: "error", stage: "validate", error: invalid, file: meta });
      return;
    }

    setState({ phase: "uploading", progress: 0, file: meta, startedAt: Date.now() });

    try {
      const result = await uploadDocument(file, (pct) => {
        setState((s) => {
          if (s.phase !== "uploading" && s.phase !== "processing") return s;
          if (pct >= 100) return { ...s, phase: "processing", progress: 100, processingAt: s.processingAt ?? Date.now() };
          return s.phase === "uploading" ? { ...s, progress: pct } : s;
        });
      });
      setState({ phase: "idle" });
      onSuccessRef.current?.(result, meta);
    } catch (e) {
      // An HTTP error response means the file reached the server. 400/413/415
      // are rejections before ingestion; anything else failed while indexing.
      const status = e?.response?.status;
      const rejectedBeforeIndexing = [400, 413, 415].includes(status);
      setState((s) => ({
        phase: "error",
        stage: s.phase === "processing" || (status && !rejectedBeforeIndexing) ? "processing" : "upload",
        error: describeRequestError(e, "The upload failed. Try again."),
        file: meta,
      }));
    }
  }, []);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { ...state, busy: state.phase === "uploading" || state.phase === "processing", start, reset };
}
