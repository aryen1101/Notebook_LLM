import { useRef, useState } from "react";
import { useElapsed } from "../hooks/useElapsed";
import { useFilePicker } from "../hooks/useFilePicker";
import { Check, CircleAlert, LoaderCircle, Upload, X } from "lucide-react";
import { FileIcon } from "./Brand";
import { formatBytes } from "../lib/format";

export function UploadZone({ onFile, disabled = false, compact = false }) {
  const [dragging, setDragging] = useState(false);
  const picker = useFilePicker(onFile);
  const depth = useRef(0);

  const onDrop = (e) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Upload a document. PDF, TXT or CSV, up to 20 MB."
      onClick={() => !disabled && picker.open()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          picker.open();
        }
      }}
      onDragEnter={(e) => { e.preventDefault(); depth.current += 1; setDragging(true); }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => { depth.current -= 1; if (depth.current <= 0) setDragging(false); }}
      onDrop={onDrop}
      className={`dropzone group text-center ${compact ? "px-4 py-5" : "px-6 py-9 sm:py-11"} ${dragging ? "is-dragging" : ""} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {picker.input}
      <span className={`mx-auto inline-flex items-center justify-center rounded-xl bg-surface border border-line shadow-sm text-accent-text transition-transform duration-200 group-hover:-translate-y-0.5 ${compact ? "w-9 h-9" : "w-11 h-11"} ${dragging ? "-translate-y-1" : ""}`}>
        <Upload className={compact ? "w-4 h-4" : "w-5 h-5"} aria-hidden="true" />
      </span>
      <p className={`mt-3 font-medium text-ink ${compact ? "text-[13px]" : "text-[15px]"}`}>
        {dragging ? "Drop to upload" : compact ? "Drop a file or browse" : "Drop a file here, or browse"}
      </p>
      <p className="mt-1 text-[12.5px] text-muted">PDF, TXT or CSV, up to 20 MB</p>
      {!compact && (
        <div className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
          {["pdf", "txt", "csv"].map((ext) => (
            <span key={ext} className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2 rounded-md bg-surface border border-line text-[11.5px] font-medium text-ink-2">
              <FileIcon ext={ext} size="sm" />
              {ext.toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StepIcon({ status }) {
  if (status === "done") return <span className="w-5 h-5 rounded-full bg-ok text-surface inline-flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" /></span>;
  if (status === "active") return <span className="w-5 h-5 rounded-full bg-accent-soft text-accent-text inline-flex items-center justify-center"><LoaderCircle className="w-3 h-3 animate-spin" aria-hidden="true" /></span>;
  if (status === "failed") return <span className="w-5 h-5 rounded-full bg-bad text-surface inline-flex items-center justify-center"><X className="w-3 h-3" strokeWidth={3} aria-hidden="true" /></span>;
  return <span className="w-5 h-5 rounded-full border-[1.5px] border-line-strong inline-block" aria-hidden="true" />;
}

const SERVER_STEPS = ["Extract text", "Split into chunks", "Create embeddings", "Store vectors in Qdrant"];

/**
 * Shows only states we can observe. Upload % comes from the browser; the four
 * server steps happen inside one request, so they share a single in-progress
 * state and are only marked done when the server responds successfully.
 */
export function UploadProgress({ upload, onRetry, onDismiss }) {
  const elapsed = useElapsed(upload.phase === "processing" ? upload.processingAt : null);
  const { phase, stage, file } = upload;

  const uploadStatus = phase === "uploading" ? "active" : phase === "processing" ? "done" : stage === "upload" || stage === "validate" ? "failed" : "done";
  const serverStatus = phase === "processing" ? "active" : phase === "error" && stage === "processing" ? "failed" : "pending";

  return (
    <div className="panel p-4 shadow-sm anim-pop" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <FileIcon ext={file?.ext} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-ink truncate">{file?.name || "Document"}</p>
          <p className="text-[12px] text-muted">
            {phase === "error" ? "Not indexed" : phase === "processing" ? `Indexing on the server, ${elapsed}s` : `Uploading ${formatBytes(file?.size) ?? ""}`}
          </p>
        </div>
        {phase === "error" && (
          <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {stage !== "validate" && (
        <ol className="mt-4 space-y-3">
          <li className="flex gap-3">
            <StepIcon status={uploadStatus} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ink font-medium">Upload file</span>
                {phase === "uploading" && <span className="text-muted tabular-nums">{upload.progress}%</span>}
              </div>
              {phase === "uploading" && (
                <div className="bar mt-2" aria-hidden="true"><span style={{ width: `${upload.progress}%` }} /></div>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <StepIcon status={serverStatus} />
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-medium ${serverStatus === "pending" ? "text-muted" : "text-ink"}`}>Index on the server</p>
              <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                {SERVER_STEPS.map((s) => (
                  <li key={s} className="flex items-center gap-1.5 text-[12px] text-muted">
                    <span className={`dot ${serverStatus === "active" ? "thinking-dot text-accent" : ""}`} aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>
              {phase === "processing" && <div className="bar is-indeterminate mt-2.5" aria-hidden="true"><span /></div>}
              {phase === "processing" && elapsed >= 20 && (
                <p className="mt-2 text-[12px] text-muted">Large files take longer. If the server was asleep, the first upload can take over a minute.</p>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <StepIcon status="pending" />
            <p className="text-[13px] font-medium text-muted">Ready for questions</p>
          </li>
        </ol>
      )}

      {phase === "error" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-bad-soft text-bad px-3 py-2.5 text-[13px]" role="alert">
          <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p>{upload.error}</p>
            {stage !== "validate" && (
              <button type="button" onClick={onRetry} className="mt-1.5 font-medium underline underline-offset-2">
                Choose a file to try again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
