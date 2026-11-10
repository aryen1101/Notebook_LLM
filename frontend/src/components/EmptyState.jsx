import { RefreshCw, WifiOff } from "lucide-react";
import { UploadProgress, UploadZone } from "./UploadZone";
import { useFilePicker } from "../hooks/useFilePicker";
import { displayTitle } from "../lib/format";

const STEPS = [
  { title: "Add a source", body: "Upload a PDF, TXT or CSV. It's split into passages and indexed for search." },
  { title: "Ask in your own words", body: "Questions in any language work. Complex ones are broken into smaller searches." },
  { title: "Check the passages", body: "Every answer cites its sources and is checked against them before you see it." },
];

const PROMPTS = [
  "Summarize this document in five bullet points",
  "What are the main arguments or findings?",
  "List the key terms and what they mean",
  "What questions does this document leave open?",
];

/** No document yet: one clear job, add a source. */
export function OnboardingState({ upload, onFile, offline, onRetryConnection }) {
  const picker = useFilePicker(onFile);
  const showProgress = upload.busy || upload.phase === "error";

  return (
    <div className="mx-auto w-full max-w-[640px] px-1 py-8 sm:py-14 intro">
      <h1 className="font-serif text-[34px] sm:text-[44px] leading-[1.08] tracking-[-0.015em] text-ink">
        Ask your documents, and see where every answer comes from.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-2 max-w-[52ch]">
        Upload a document and ask questions about it. Answers are written only from its contents, with numbered citations you can open to read the original passage.
      </p>

      <div className="mt-8">
        {offline ? (
          <div className="rounded-2xl border border-line bg-paper px-6 py-8 text-center">
            <WifiOff className="w-5 h-5 mx-auto text-bad" aria-hidden="true" />
            <p className="mt-3 text-[15px] font-medium text-ink">Uploads are unavailable while the server is offline</p>
            <p className="mt-1 text-[13px] text-muted max-w-[44ch] mx-auto">The server sleeps when it hasn't been used for a while and can take a minute to wake.</p>
            <button type="button" className="btn btn-secondary mt-4" onClick={onRetryConnection}>
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Check again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {picker.input}
            {showProgress && <UploadProgress upload={upload} onRetry={picker.open} onDismiss={upload.reset} />}
            {!upload.busy && <UploadZone onFile={onFile} />}
          </div>
        )}
      </div>

      <ol className="mt-10 grid gap-5 sm:grid-cols-3 border-t border-line pt-6">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-line-strong text-[12px] font-semibold text-ink-2 tabular-nums">{i + 1}</span>
            <p className="mt-2.5 text-[13.5px] font-semibold text-ink">{s.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Document ready, no messages yet: suggest first questions. */
export function ReadyState({ docInfo, onAsk, disabled }) {
  const title = docInfo ? displayTitle(docInfo.originalName || docInfo.fileName) : "your document";
  return (
    <div className="mx-auto w-full max-w-[640px] py-10 sm:py-16 intro">
      <h1 className="font-serif text-[30px] sm:text-[38px] leading-[1.12] tracking-[-0.01em] text-ink break-words">
        What would you like to know about {title}?
      </h1>
      <p className="mt-3 text-[14.5px] text-ink-2">
        {docInfo?.totalChunks ? `${docInfo.totalChunks.toLocaleString()} passages are indexed. ` : ""}
        Answers cite the passages they use.
      </p>
      <div className="mt-7 grid gap-2 sm:grid-cols-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onAsk(p)}
            className="text-left rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] text-ink-2 hover:text-ink hover:border-line-strong hover:bg-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
