import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp, FileText, Bot, User } from "lucide-react";

function SourcesDrawer({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;

  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-slate-700/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700/80 transition-colors"
      >
        <span className="flex items-center gap-2 text-slate-500 text-xs">
          <FileText className="w-3 h-3" />
          {sources.length} source{sources.length !== 1 ? "s" : ""} used
        </span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
        }
      </button>
      {open && (
        <div className="divide-y divide-slate-700/40">
          {sources.map((src, i) => (
            <div key={i} className="px-3 py-2.5 bg-slate-900/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-violet-400 text-xs font-mono">#{i + 1}</span>
                {src.page && <span className="text-slate-600 text-xs">Page {src.page}</span>}
              </div>
              <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 font-mono">{src.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-up ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? "bg-violet-600" : "bg-slate-700"
      }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5 text-slate-400" />
        }
      </div>

      {/* Content */}
      <div className={`max-w-[78%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-violet-600 text-white rounded-tr-sm"
            : "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-sm"
        }`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="text-violet-300 font-semibold">{children}</strong>,
                code: ({ inline, children }) =>
                  inline
                    ? <code className="bg-slate-900 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                    : <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono text-slate-300">{children}</pre>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-slate-300">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-slate-300">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && message.sources && (
          <div className="w-full">
            <SourcesDrawer sources={message.sources} />
          </div>
        )}
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