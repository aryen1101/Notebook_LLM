import { LoaderCircle, WifiOff } from "lucide-react";

/** Compact server status pill. Data comes from useBackendStatus() in App. */
export function StatusBar({ backend, onRetry }) {
  if (backend.phase === "connecting") {
    return (
      <span className="badge badge-neutral" role="status">
        <LoaderCircle className="w-3 h-3 animate-spin" aria-hidden="true" />
        Connecting
      </span>
    );
  }

  if (backend.phase === "offline") {
    return (
      <button type="button" onClick={onRetry} className="badge badge-bad hover:opacity-80" title="Check the server again">
        <WifiOff className="w-3 h-3" aria-hidden="true" />
        Server offline
      </button>
    );
  }

  return (
    <span className={`badge ${backend.ready ? "badge-ok" : "badge-neutral"}`} role="status" title={backend.ready ? `${backend.vectorsStored.toLocaleString()} vectors stored in Qdrant` : "No vectors stored"}>
      <span className="dot" aria-hidden="true" />
      {backend.ready ? `${backend.vectorsStored.toLocaleString()} vectors` : "No document indexed"}
    </span>
  );
}
