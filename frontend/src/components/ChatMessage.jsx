import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Bot,
  User,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Sparkles,
  Languages,
  Search,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Groundedness verdict badge (from the LLM-as-judge step)
 * ------------------------------------------------------------------ */
const VERDICT_STYLES = {
  grounded: {
    label: "Grounded",
    icon: ShieldCheck,
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  partially_grounded: {
    label: "Partially grounded",
    icon: ShieldAlert,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  hallucinated: {
    label: "Low confidence",
    icon: ShieldX,
    className: "bg-red-500/10 text-red-400 border-red-500/30",
  },
};

function VerdictBadge({ judgment }) {
  if (!judgment?.verdict) return null;
  const style = VERDICT_STYLES[judgment.verdict];
  if (!style) return null;
  const Icon = style.icon;
  return (
    <span
      title={judgment.reason || ""}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${style.className}`}
    >
      <Icon className="w-3 h-3" />
      {style.label}
      {typeof judgment.groundedness === "number" && (
        <span className="opacity-70 font-mono">· {judgment.groundedness}/5</span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Collapsible panel: retrieval pipeline + verification + sources
 * ------------------------------------------------------------------ */
function DetailsDrawer({ message }) {
  const [open, setOpen] = useState(false);
  const { sources, rewrittenQuery, subQueries, judgment, language } = message;

  const hasPipeline =
    rewrittenQuery || (subQueries && subQueries.length > 0) || judgment;
  const hasSources = sources?.length > 0;
  if (!hasPipeline && !hasSources) return null;

  const isNonEnglish = language && !/english/i.test(language);

  return (
    <div className="mt-2 w-full rounded-lg overflow-hidden border border-slate-700/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700/80 transition-colors"
      >
        <span className="flex items-center gap-2 text-slate-400 text-xs">
          <Sparkles className="w-3 h-3 text-violet-400" />
          Retrieval &amp; verification
          {hasSources && (
            <span className="text-slate-600">
              · {sources.length} source{sources.length !== 1 ? "s" : ""}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="bg-slate-900/60 px-3 py-3 space-y-3">
          {/* Verification (LLM-as-judge) */}
          {judgment && (
            <div className="space-y-1.5">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">
                Verification
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <VerdictBadge judgment={judgment} />
                {typeof judgment.relevance === "number" && (
                  <span className="px-2 py-0.5 rounded-full border border-slate-700 text-slate-400 font-mono">
                    relevance {judgment.relevance}/5
                  </span>
                )}
              </div>
              {judgment.reason && (
                <p className="text-slate-500 text-xs leading-relaxed italic">
                  “{judgment.reason}”
                </p>
              )}
            </div>
          )}

          {/* Query understanding */}
          {(rewrittenQuery || isNonEnglish) && (
            <div className="space-y-1.5">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">
                Query understanding
              </p>
              {isNonEnglish && (
                <p className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Languages className="w-3 h-3 text-violet-400" />
                  Detected language: <span className="text-slate-300">{language}</span>
                </p>
              )}
              {rewrittenQuery && (
                <p className="flex items-start gap-1.5 text-slate-400 text-xs">
                  <Search className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Search query:{" "}
                    <span className="text-slate-300 font-mono">{rewrittenQuery}</span>
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Sub-queries */}
          {subQueries && subQueries.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">
                Sub-queries searched
              </p>
              <ul className="space-y-1">
                {subQueries.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-slate-400 text-xs"
                  >
                    <span className="text-violet-400 font-mono">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sources */}
          {hasSources && (
            <div className="space-y-1.5">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">
                Sources used
              </p>
              <div className="space-y-1.5">
                {sources.map((src, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-slate-700/50 bg-slate-800/40 px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-violet-400 text-xs font-mono">
                        #{i + 1}
                      </span>
                      {src.page && (
                        <span className="text-slate-600 text-xs">
                          Page {src.page}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 font-mono">
                      {src.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Markdown renderer config (react-markdown v10 — no `inline` prop)
 * ------------------------------------------------------------------ */
const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="text-violet-300 font-semibold">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-violet-300 underline underline-offset-2 hover:text-violet-200"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="bg-slate-900 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono text-slate-300">
      {children}
    </pre>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 my-2 text-slate-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 my-2 text-slate-300">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
};

export function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-up ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser ? "bg-violet-600" : "bg-slate-700"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-slate-400" />
        )}
      </div>

      {/* Content */}
      <div className={`max-w-[78%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-violet-600 text-white rounded-tr-sm"
              : "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-sm"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Verdict badge directly under the answer for at-a-glance trust signal */}
        {!isUser && message.judgment?.verdict && (
          <div className="mt-1.5">
            <VerdictBadge judgment={message.judgment} />
          </div>
        )}

        {/* Full retrieval + verification details */}
        {!isUser && <DetailsDrawer message={message} />}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-up">
      <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
