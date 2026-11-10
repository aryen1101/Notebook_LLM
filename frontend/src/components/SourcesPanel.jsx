import { useState } from "react";
import { ChevronDown, CircleAlert, Quote, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { FileIcon } from "./Brand";
import { UploadProgress, UploadZone } from "./UploadZone";
import { useFilePicker } from "../hooks/useFilePicker";
import { citedIndexes, formatBytes, relativeTime } from "../lib/format";

const DOC_BADGE = {
  ready: { cls: "badge-ok", label: "Ready" },
  "ready-unknown": { cls: "badge-ok", label: "Ready" },
  checking: { cls: "badge-neutral", label: "Checking" },
  unverified: { cls: "badge-warn", label: "Can't verify" },
  missing: { cls: "badge-warn", label: "Not on server" },
};

export function DocumentCard({ docInfo, docState, vectors, onReplace, onRemove, justIndexed, busy }) {
  const picker = useFilePicker(onReplace);
  const badge = DOC_BADGE[docState];
  const unknown = docState === "ready-unknown";

  const rows = [
    ["Type", docInfo?.fileType?.toUpperCase()],
    ["Size", formatBytes(docInfo?.fileSize)],
    ["Chunks", docInfo?.totalChunks?.toLocaleString()],
    ["Vectors stored", docState === "ready" || unknown ? vectors?.toLocaleString() : null],
    ["Added", relativeTime(docInfo?.uploadedAt)],
  ].filter(([, v]) => v);

  return (
    <div className={`panel shadow-sm ${justIndexed ? "anim-flash" : ""}`}>
      {picker.input}
      <div className="p-4 flex items-start gap-3">
        <FileIcon ext={docInfo?.fileType} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-ink break-words" title={docInfo?.originalName || docInfo?.fileName}>
            {unknown ? "Indexed document" : docInfo?.originalName || docInfo?.fileName}
          </p>
          {badge && (
            <span className={`badge ${badge.cls} mt-1.5`}>
              <span className="dot" aria-hidden="true" />
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {unknown && (
        <p className="px-4 -mt-1 pb-3 text-[12.5px] text-muted">
          The server has a document indexed, but its details weren't saved in this browser. You can ask questions about it, or replace it.
        </p>
      )}
      {docState === "missing" && (
        <p className="mx-4 mb-3 flex gap-2 rounded-lg bg-warn-soft text-warn px-3 py-2 text-[12.5px]">
          <CircleAlert className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
          The server has no indexed copy of this document. It may have been removed, or the vector database may be paused. Upload it again to keep asking questions.
        </p>
      )}
      {docState === "unverified" && (
        <p className="mx-4 mb-3 flex gap-2 rounded-lg bg-warn-soft text-warn px-3 py-2 text-[12.5px]">
          <CircleAlert className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
          The server is offline, so this document's status can't be checked.
        </p>
      )}

      {rows.length > 0 && (
        <dl className="mx-4 mb-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3">
          {rows.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[11.5px] text-muted">{k}</dt>
              <dd className="text-[13px] text-ink tabular-nums truncate">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {docInfo?.chunkingStrategy && (
        <p className="mx-4 mb-3 text-[11.5px] text-muted leading-snug">Chunking: {docInfo.chunkingStrategy}</p>
      )}

      <div className="flex items-center gap-1 border-t border-line px-2 py-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={picker.open} disabled={busy}>
          {docState === "missing" ? <Upload className="w-3.5 h-3.5" aria-hidden="true" /> : <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
          {docState === "missing" ? "Upload again" : "Replace"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm ml-auto hover:!text-bad" onClick={onRemove} disabled={busy}>
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>
    </div>
  );
}

export function SourceCard({ source, index, cited, highlighted, id }) {
  // A citation click opens the passage; the reader can still collapse it.
  const [manual, setManual] = useState(null);
  const expanded = manual ?? Boolean(highlighted);
  const setExpanded = (fn) => setManual(fn(expanded));
  const long = (source.text?.length ?? 0) > 280;

  return (
    <article id={id} className={`panel p-3.5 scroll-mt-4 transition-colors ${highlighted ? "anim-flash" : ""}`}>
      <header className="flex items-center gap-2">
        <span className="cite !m-0 !text-[11px] !h-5 !min-w-[22px] !align-baseline cursor-default" data-active={highlighted} aria-hidden="true">
          {index + 1}
        </span>
        <span className="text-[12.5px] font-medium text-ink">Source {index + 1}</span>
        {source.page != null && <span className="text-[12px] text-muted">Page {source.page}</span>}
        {!cited && <span className="ml-auto text-[11.5px] text-muted" title="Retrieved as context but not cited in the answer">Not cited</span>}
      </header>
      <p className={`excerpt mt-2 whitespace-pre-line ${expanded ? "" : "clamp-4"}`}>{source.text}</p>
      {long && (
        <button type="button" className="mt-1.5 text-[12px] font-medium text-accent-text hover:underline underline-offset-2" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? "Show less" : "Show full passage"}
        </button>
      )}
    </article>
  );
}

export function SourcesPanel({
  open, onClose, docInfo, docState, backend, upload, onFile, onRemove, justIndexed,
  activeMessage, activeQuestion, highlight, uploadInMain = false,
}) {
  const [docOpen, setDocOpen] = useState(true);
  const retryPicker = useFilePicker(onFile);
  const sources = activeMessage?.sources ?? [];
  const cited = citedIndexes(activeMessage?.content, sources.length);
  const hasDoc = docInfo || docState === "ready-unknown";
  // When the main area is already showing the upload flow, don't repeat it here.
  const showProgress = (upload.busy || upload.phase === "error") && !uploadInMain;

  return (
    <aside id="sources-panel" className={`sources-col flex-shrink-0 flex flex-col h-full ${open ? "is-open" : ""}`} aria-label="Sources">
      <div className="h-14 flex items-center gap-2 px-4 flex-shrink-0">
        <h2 className="text-[14px] font-semibold text-ink">Sources</h2>
        <button type="button" className="icon-btn ml-auto wide:hidden" onClick={onClose} aria-label="Close sources">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
        <section aria-labelledby="doc-heading">
          <button type="button" className="w-full flex items-center gap-1 mb-2.5" onClick={() => setDocOpen((v) => !v)} aria-expanded={docOpen}>
            <h3 id="doc-heading" className="section-title">Document</h3>
            <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${docOpen ? "" : "-rotate-90"}`} aria-hidden="true" />
          </button>
          <div className={`reveal ${docOpen ? "is-open" : ""}`}>
            <div className="space-y-3">
              {retryPicker.input}
              {showProgress && <UploadProgress upload={upload} onRetry={retryPicker.open} onDismiss={upload.reset} />}
              {uploadInMain && !hasDoc && (
                <p className="text-[12.5px] text-muted leading-relaxed">No document yet. Add one from the main area to get started.</p>
              )}
              {hasDoc && !upload.busy && (
                <DocumentCard docInfo={docInfo} docState={docState} vectors={backend.vectorsStored} onReplace={onFile} onRemove={onRemove} justIndexed={justIndexed} busy={upload.busy} />
              )}
              {!hasDoc && !upload.busy && !uploadInMain && (
                <UploadZone onFile={onFile} compact disabled={backend.phase === "offline"} />
              )}
              {!hasDoc && !upload.busy && !uploadInMain && <p className="text-[12px] text-muted">A notebook holds one document at a time. Uploading a new one replaces it.</p>}
            </div>
          </div>
        </section>

        <section aria-labelledby="passages-heading">
          <h3 id="passages-heading" className="section-title mb-1">Passages used</h3>
          {activeMessage && sources.length > 0 ? (
            <>
              <p className="text-[12.5px] text-muted mb-3 line-clamp-2">
                For &ldquo;{activeQuestion}&rdquo;
              </p>
              <div className="space-y-2.5">
                {sources.map((src, i) => (
                  <SourceCard
                    key={`${activeMessage.id}-${i}`}
                    id={`src-${activeMessage.id}-${i}`}
                    source={src}
                    index={i}
                    cited={cited.size === 0 || cited.has(i)}
                    highlighted={highlight?.msgId === activeMessage.id && highlight?.index === i ? highlight.nonce : 0}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center">
              <Quote className="w-5 h-5 mx-auto text-muted" aria-hidden="true" />
              <p className="mt-2 text-[12.5px] text-muted leading-relaxed">
                {activeMessage
                  ? "This answer didn't use any passages from the document."
                  : "After you ask a question, the passages the answer draws on appear here."}
              </p>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
