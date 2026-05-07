import { useEffect, useState } from "react";
import { Database, WifiOff, Circle } from "lucide-react";
import { getStatus } from "../lib/api";

export function StatusBar({ refreshTrigger }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setStatus(await getStatus());
      } catch {
        setStatus(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
        <Circle className="w-2 h-2 text-slate-600 animate-pulse" />
        <span className="text-xs text-slate-500">connecting…</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
        <WifiOff className="w-3 h-3 text-red-500" />
        <span className="text-xs text-red-400">backend offline</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
      status.ready
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        : "bg-slate-800 border-slate-700 text-slate-500"
    }`}>
      <Database className="w-3 h-3" />
      {status.ready ? `${status.vectorsStored.toLocaleString()} vectors` : "no document"}
    </div>
  );
}