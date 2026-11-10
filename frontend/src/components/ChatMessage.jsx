import { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, ChevronDown, CircleAlert, Copy, Languages, Quote, RotateCcw, Search, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { LogoMark } from "./Brand";
import { useElapsed } from "../hooks/useElapsed";
import { linkCitations } from "../lib/format";

/* Groundedness verdict from the backend's LLM-as-judge step. */
const VERDICTS = {
  grounded: { label: "Grounded", icon: ShieldCheck, cls: "badge-ok" },
  partially_grounded: { label: "Partly grounded", icon: ShieldAlert, cls: "badge-warn" },
  hallucinated: { label: "Low confidence", icon: ShieldX, cls: "badge-bad" },
};

function VerdictBadge({ judgment }) {
  const v = VERDICTS[judgment?.verdict];
  if (!v) return null;
  const Icon = v.icon;
  return (
    <span className={`badge ${v.cls}`} title={judgment.reason || "Checked against the retrieved passages"}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {v.label}
      {typeof judgment.groundedness === "number" && <span className="opacity-75 tabular-nums">{judgment.groundedness}/5</span>}
    </span>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard can be blocked; nothing to recover */
    }
  };
  return [copied, copy];
}

function CodeBlock({ children, node }) {
  const [copied, copy] = useCopy();
  const raw = node?.children?.[0]?.children?.map((c) => c.value ?? "").join("") ?? "";
  return (
    <div className="relative group/code">
      <pre>{children}</pre>
      {raw && (
        <button type="button" onClick={() => copy(raw)} className="icon-btn !w-7 !h-7 absolute top-1.5 right-1.5 bg-surface border border-line opacity-0 group-hover/code:opacity-100 focus-visible:opacity-100" aria-label={copied ? "Copied" : "Copy code"}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function PipelineDetails({ message }) {
  const { judgment, rewrittenQuery, subQueries, language } = message;
  const nonEnglish = language && !/english/i.test(language);
  return (
    <div className="mt-3 rounded-xl border border-line bg-paper p-4 space-y-4 text-[13px]">
      {judgment && (
        <div>
          <p className="section-title mb-1.5">Answer check</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <VerdictBadge judgment={judgment} />
            {typeof judgment.relevance === "number" && <span className="badge badge-neutral tabular-nums">Relevance {judgment.relevance}/5</span>}
          </div>
          {judgment.reason && <p className="mt-2 text-ink-2 leading-relaxed">{judgment.reason}</p>}
        </div>
      )}
      {(rewrittenQuery || nonEnglish) && (
        <div>
          <p className="section-title mb-1.5">How your question was searched</p>
          {nonEnglish && (
            <p className="flex items-center gap-2 text-ink-2 mb-1">
              <Languages className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              Detected {language}; searched in English and translated back.
            </p>
          )}
          {rewrittenQuery && (
            <p className="flex items-start gap-2 text-ink-2">
              <Search className="w-3.5 h-3.5 text-muted mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{rewrittenQuery}</span>
            </p>
          )}
        </div>
      )}
      {subQueries?.length > 1 && (
        <div>
          <p className="section-title mb-1.5">Broken into {subQueries.length} searches</p>
          <ol className="space-y-1 list-decimal pl-5 text-ink-2 marker:text-muted">
            {subQueries.map((q, i) => <li key={i}>{q}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ message, isLast, busy, onRegenerate, onCite, onShowSources, isActive, activeCite }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, copy] = useCopy();
  const sources = useMemo(() => message.sources ?? [], [message.sources]);
  const hasDetails = Boolean(message.judgment || message.rewrittenQuery || message.subQueries?.length > 1);

  const content = useMemo(() => linkCitations(message.content, sources.length), [message.content, sources.length]);

  const components = useMemo(() => ({
    a: ({ href, children }) => {
      if (href?.startsWith("#cite-")) {
        const n = Number(href.slice(6));
        return (
          <button type="button" className="cite" data-active={isActive && activeCite === n - 1} onClick={() => onCite(message.id, n - 1)} aria-label={`Show source ${n}`} title={sources[n - 1]?.page != null ? `Source ${n}, page ${sources[n - 1].page}` : `Source ${n}`}>
            {children}
          </button>
        );
      }
      return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
    },
    pre: CodeBlock,
    table: ({ children }) => <div className="table-wrap"><table>{children}</table></div>,
  }), [message.id, onCite, isActive, activeCite, sources]);

  if (message.error) {
    return (
      <div className="flex gap-3 anim-rise">
        <span className="w-7 h-7 rounded-lg bg-bad-soft text-bad inline-flex items-center justify-center flex-shrink-0">
          <CircleAlert className="w-4 h-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[14px] text-ink">This question didn't get an answer.</p>
          <p className="mt-0.5 text-[13px] text-ink-2">{message.content}</p>
          {isLast && (
            <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => onRegenerate(message.id)} disabled={busy}>
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 anim-rise">
      <LogoMark size={28} className="flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="answer">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
          </ReactMarkdown>
        </div>

        <div className="mt-3 -ml-2 flex flex-wrap items-center gap-1">
          {sources.length > 0 && (
            <button type="button" className="chip" onClick={() => onShowSources(message.id)} aria-pressed={isActive}>
              <Quote className="w-3.5 h-3.5" aria-hidden="true" />
              {sources.length} {sources.length === 1 ? "source" : "sources"}
            </button>
          )}
          {hasDetails && (
            <button type="button" className="chip" onClick={() => setDetailsOpen((v) => !v)} aria-expanded={detailsOpen}>
              How this was answered
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          )}
          {message.judgment?.verdict && <span className="ml-1"><VerdictBadge judgment={message.judgment} /></span>}
          <span className="flex-1" />
          <button type="button" className="icon-btn" onClick={() => copy(message.content)} aria-label={copied ? "Copied" : "Copy answer"} title={copied ? "Copied" : "Copy answer"}>
            {copied ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4" />}
          </button>
          {isLast && (
            <button type="button" className="icon-btn" onClick={() => onRegenerate(message.id)} disabled={busy} aria-label="Regenerate answer" title="Regenerate answer">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {hasDetails && (
          <div className={`reveal ${detailsOpen ? "is-open" : ""}`} aria-hidden={!detailsOpen}>
            <div>{detailsOpen && <PipelineDetails message={message} />}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ message }) {
  return (
    <div className="flex justify-end anim-rise">
      <p className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-sunken border border-line px-4 py-2.5 text-[14.5px] leading-relaxed text-ink whitespace-pre-wrap break-words">
        {message.content}
      </p>
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage(props) {
  return props.message.role === "user" ? <UserMessage message={props.message} /> : <AssistantMessage {...props} />;
});

/**
 * The backend returns one response with no intermediate events, so this only
 * says what the pipeline always does and how long it has been working.
 */
export function TypingIndicator({ since }) {
  const elapsed = useElapsed(since);
  return (
    <div className="flex gap-3 anim-rise" role="status" aria-live="polite">
      <LogoMark size={28} className="flex-shrink-0 thinking-dot" />
      <div className="pt-1">
        <p className="text-[14px] text-ink-2">
          Searching your document and checking the answer
          <span className="text-muted tabular-nums">{elapsed > 0 ? `, ${elapsed}s` : ""}</span>
        </p>
        {elapsed >= 25 && <p className="mt-1 text-[12.5px] text-muted">Still working. If the server was asleep, the first answer can take about a minute.</p>}
      </div>
    </div>
  );
}
