import { useCallback, useEffect, useRef, useState } from "react";
import { getStatus } from "../lib/api";

/**
 * Tracks GET /api/status.
 * phase: "connecting" | "online" | "offline"
 * The backend answers { ready, vectorsStored }; it reports ready:false both when
 * no document exists and when Qdrant can't be reached, so the UI words that
 * state carefully.
 */
export function useBackendStatus() {
  const [status, setStatus] = useState({ phase: "connecting", ready: false, vectorsStored: 0, checkedAt: null });
  const inFlight = useRef(false);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!quiet) setStatus((s) => ({ ...s, phase: "connecting" }));
    try {
      const data = await getStatus();
      setStatus({ phase: "online", ready: Boolean(data.ready), vectorsStored: data.vectorsStored ?? 0, checkedAt: Date.now() });
    } catch {
      setStatus((s) => ({ ...s, phase: "offline", checkedAt: Date.now() }));
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refresh({ quiet: true }), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  // When the tab regains focus after being offline, check again quietly.
  const phaseRef = useRef(status.phase);
  useEffect(() => {
    phaseRef.current = status.phase;
  }, [status.phase]);

  useEffect(() => {
    const onFocus = () => {
      if (phaseRef.current === "offline") refresh({ quiet: true });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { ...status, refresh };
}
