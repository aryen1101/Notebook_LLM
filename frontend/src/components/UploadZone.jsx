import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, X, AlertCircle } from "lucide-react";
import { uploadDocument } from "../lib/api";

export function UploadZone({ onUploadSuccess, docReady, onRemove, docInfo }) {
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);
  const inputRef                  = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "txt", "csv"].includes(ext)) {
      setError("Only PDF, TXT, and CSV files are supported.");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadDocument(file, setProgress);
      onUploadSuccess?.(result);
    } catch (e) {
      setError(e.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  if (docInfo && docReady) {
    return (
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-emerald-400 text-xs font-medium">Indexed</p>
              <p className="text-gray-400 text-xs truncate mt-0.5">{docInfo.fileName}</p>
              <p className="text-gray-600 text-xs mt-0.5">{docInfo.totalChunks} chunks · {docInfo.fileType?.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (docInfo && !docReady) {
    return (
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-amber-400 text-xs font-medium">Re-upload needed</p>
              <p className="text-gray-400 text-xs truncate mt-0.5">{docInfo.fileName}</p>
            </div>
          </div>
          <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-2 w-full text-xs text-amber-400 hover:text-amber-300 transition-colors text-center py-1"
        >
          Click to re-upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
          dragging ? "border-violet-500 bg-violet-500/10" : "border-gray-700 hover:border-gray-500 hover:bg-gray-700/30"
        } ${uploading ? "cursor-not-allowed" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
            <p className="text-gray-400 text-sm">Indexing document…</p>
            <div className="w-full bg-gray-700 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-gray-600 text-xs">{progress}%</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-gray-300 text-sm font-medium">Drop file here</p>
            <p className="text-gray-600 text-xs">or click to browse</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {["PDF", "TXT", "CSV"].map((ext) => (
                <span key={ext} className="px-2 py-0.5 bg-gray-700 rounded text-gray-500 text-xs font-mono">{ext}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}