import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Menu, PanelRight, RefreshCw, WifiOff } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { SourcesPanel } from "./components/SourcesPanel";
import { ChatMessage, TypingIndicator } from "./components/ChatMessage";
import { Composer } from "./components/Composer";
import { OnboardingState, ReadyState } from "./components/EmptyState";
import { StatusBar } from "./components/StatusBar";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useBackendStatus } from "./hooks/useBackendStatus";
import { useUpload } from "./hooks/useUpload";
import { sendChat, deleteDocument } from "./lib/api";
import { describeRequestError, displayTitle } from "./lib/format";
import { applyTheme } from "./lib/theme";

let idCounter = 0;
const newId = () => `${Date.now()}-${idCounter++}`;

export default function App() {
  // Persisted (same keys as before so existing conversations survive the redesign).
  const [messages, setMessages] = useLocalStorage("rag_messages", []);
  const [docInfo, setDocInfo] = useLocalStorage("rag_doc_info", null);
  const [theme, setTheme] = useLocalStorage("nl_theme", "system");
  const [collapsed, setCollapsed] = useLocalStorage("nl_sidebar_collapsed", false);

  const backend = useBackendStatus();
  const isWide = useMediaQuery("(min-width: 1200px)");

  const [pendingSince, setPendingSince] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [justIndexed, setJustIndexed] = useState(false);

  const composerRef = useRef(null);
  const scrollRef = useRef(null);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const typing = pendingSince !== null;

  /* ---------- Theme ---------- */
  // Initial value is already applied pre-paint by the script in index.html.
  useEffect(() => { applyTheme(theme); }, [theme]);

  /* ---------- Document state, derived from local info + server status ---------- */
  const docState = useMemo(() => {
    if (backend.phase === "connecting" && !backend.checkedAt) return docInfo ? "checking" : "none";
    if (backend.phase === "offline") return docInfo ? "unverified" : "offline";
    if (backend.ready) return docInfo ? "ready" : "ready-unknown";
    return docInfo ? "missing" : "none";
  }, [backend.phase, backend.ready, backend.checkedAt, docInfo]);

  const hasDoc = Boolean(docInfo) || docState === "ready-unknown";

  /* ---------- Upload ---------- */
  const handleUploaded = useCallback(async (result, meta) => {
    setDocInfo({ ...result, originalName: meta.name, fileSize: meta.size, uploadedAt: Date.now() });
    setMessages([]);
    setActiveId(null);
    setHighlight(null);
    setJustIndexed(true);
    setTimeout(() => setJustIndexed(false), 1500);
    await backend.refresh({ quiet: true });
  }, [setDocInfo, setMessages, backend]);

  const upload = useUpload(handleUploaded);

  const requestUpload = useCallback((file) => {
    if (!hasDoc || docState === "missing") return upload.start(file);
    setConfirm({
      title: "Replace the current document?",
      body: <>A notebook holds one document. Uploading <strong className="text-ink">{file.name}</strong> removes the current one from the index and clears this conversation.</>,
      confirmLabel: "Replace document",
      tone: "primary",
      onConfirm: async () => { setConfirm(null); upload.start(file); },
    });
  }, [hasDoc, docState, upload]);

  /* ---------- Remove / new notebook ---------- */
  const resetLocal = useCallback(() => {
    setMessages([]);
    setDocInfo(null);
    setActiveId(null);
    setHighlight(null);
    setConfirm(null);
  }, [setMessages, setDocInfo]);

  const removeDocument = useCallback(async () => {
    try {
      await deleteDocument();
    } catch (e) {
      throw new Error(describeRequestError(e, "The server couldn't remove the document."), { cause: e });
    }
    resetLocal();
    await backend.refresh({ quiet: true });
  }, [resetLocal, backend]);

  const askRemove = () => setConfirm({
    title: "Remove this document?",
    body: "It will be deleted from the vector index and this conversation will be cleared. This can't be undone.",
    confirmLabel: "Remove document",
    onConfirm: removeDocument,
    secondary: { label: "Clear from this browser only", onClick: resetLocal },
  });

  const askNewNotebook = () => {
    setNavOpen(false);
    if (!hasDoc && messages.length === 0) { composerRef.current?.focus(); return; }
    setConfirm({
      title: "Start a new notebook?",
      body: hasDoc
        ? "The server keeps one document at a time, so starting over removes the current document from the index and clears this conversation."
        : "This clears the current conversation.",
      confirmLabel: "Start new notebook",
      onConfirm: hasDoc ? removeDocument : async () => resetLocal(),
      secondary: hasDoc ? { label: "Clear from this browser only", onClick: resetLocal } : undefined,
    });
  };

  const askClearChat = () => setConfirm({
    title: "Clear this conversation?",
    body: "Your questions and answers will be removed from this browser. The document stays indexed.",
    confirmLabel: "Clear conversation",
    onConfirm: async () => { setMessages([]); setActiveId(null); setHighlight(null); setConfirm(null); },
  });

  /* ---------- Chat ---------- */
  const ask = useCallback(async (query, base = messagesRef.current) => {
    if (!query || pendingSince) return;
    const userMsg = { role: "user", content: query, id: newId() };
    const snapshot = [...base, userMsg];
    setMessages(snapshot);
    setPendingSince(Date.now());
    setActiveId(null);
    const history = base.filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, content: m.content }));
    try {
      const result = await sendChat(query, history);
      setMessages([...snapshot, {
        role: "assistant", id: newId(), content: result.answer, sources: result.sources, judgment: result.judgment,
        rewrittenQuery: result.rewrittenQuery, subQueries: result.subQueries, language: result.language,
      }]);
    } catch (e) {
      setMessages([...snapshot, { role: "assistant", id: newId(), error: true, content: describeRequestError(e, "The server couldn't answer this question.") }]);
    } finally {
      setPendingSince(null);
    }
  }, [pendingSince, setMessages]);

  const regenerate = useCallback((assistantId) => {
    const list = messagesRef.current;
    const idx = list.findIndex((m) => m.id === assistantId);
    const userMsg = list[idx - 1];
    if (idx < 1 || userMsg?.role !== "user") return;
    ask(userMsg.content, list.slice(0, idx - 1));
  }, [ask]);

  /* ---------- Sources panel focus ---------- */
  const lastWithSources = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant" && m.sources?.length), [messages]);
  const activeMessage = messages.find((m) => m.id === activeId) ?? lastWithSources ?? null;
  const activeQuestion = useMemo(() => {
    if (!activeMessage) return "";
    const i = messages.findIndex((m) => m.id === activeMessage.id);
    return messages[i - 1]?.content ?? "";
  }, [messages, activeMessage]);

  const showSources = useCallback((msgId) => {
    setActiveId(msgId);
    if (!isWide) setSourcesOpen(true);
  }, [isWide]);

  const cite = useCallback((msgId, index) => {
    setActiveId(msgId);
    setHighlight({ msgId, index, nonce: Date.now() });
    if (!isWide) setSourcesOpen(true);
  }, [isWide]);

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => {
      document.getElementById(`src-${highlight.msgId}-${highlight.index}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, isWide ? 30 : 320);
    return () => clearTimeout(t);
  }, [highlight, isWide]);

  /* ---------- Scrolling ---------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (el && (messages.length > 0 || typing)) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  /* ---------- Keyboard ---------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;
      if (e.key === "/" && !editing && !confirm) { e.preventDefault(); composerRef.current?.focus(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); if (window.innerWidth < 768) setNavOpen((v) => !v); else setCollapsed((v) => !v); }
      else if ((e.ctrlKey || e.metaKey) && e.key === ".") { e.preventDefault(); setSourcesOpen((v) => !v); }
      else if (e.key === "Escape" && !confirm) { setNavOpen(false); setSourcesOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, setCollapsed]);

  /* ---------- View ---------- */
  const notebookTitle = docInfo ? displayTitle(docInfo.originalName || docInfo.fileName) : hasDoc ? "Indexed document" : "Untitled notebook";
  const notebookDescription = (() => {
    if (upload.busy) return "Indexing a new document";
    if (docState === "ready") return `${docInfo.fileType?.toUpperCase()} with ${docInfo.totalChunks?.toLocaleString()} indexed passages`;
    if (docState === "ready-unknown") return `${backend.vectorsStored.toLocaleString()} indexed passages`;
    if (docState === "missing") return "Document needs to be uploaded again";
    if (docState === "unverified") return "Can't reach the server to check this document";
    if (docState === "checking") return "Checking document status";
    return "Add a document to start";
  })();

  const offline = backend.phase === "offline";
  const canAsk = !offline && !upload.busy;
  const placeholder = offline
    ? "The server is offline"
    : upload.busy ? "Wait for indexing to finish"
    : hasDoc && docState !== "missing" ? "Ask a question about your document"
    : "Upload a document first, then ask about it";
  const showOnboarding = messages.length === 0 && !typing && (!hasDoc || docState === "missing");

  return (
    <div className="app-shell flex overflow-hidden bg-paper">
      {(navOpen || (sourcesOpen && !isWide)) && (
        <div className="backdrop" aria-hidden="true" onClick={() => { setNavOpen(false); setSourcesOpen(false); }} />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        notebookTitle={notebookTitle}
        messageCount={messages.filter((m) => m.role === "user").length}
        docInfo={docInfo}
        docState={docState}
        onNewNotebook={askNewNotebook}
        onOpenSources={() => { setNavOpen(false); if (!isWide) setSourcesOpen(true); }}
        sourcesOpen={sourcesOpen}
        theme={theme}
        setTheme={setTheme}
        backend={backend}
      />

      <main className="main-col flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center gap-2 px-3 sm:px-5 border-b border-line flex-shrink-0">
          <button type="button" className="icon-btn md:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[14px] font-semibold text-ink truncate">{notebookTitle}</h1>
            <p className="text-[12px] text-muted truncate">{notebookDescription}</p>
          </div>
          <div className="hidden sm:block"><StatusBar backend={backend} onRetry={() => backend.refresh()} /></div>
          {messages.length > 0 && (
            <button type="button" className="icon-btn" onClick={askClearChat} aria-label="Clear conversation" title="Clear conversation">
              <Eraser className="w-4 h-4" />
            </button>
          )}
          <button type="button" className="icon-btn wide:hidden" onClick={() => setSourcesOpen(true)} aria-label="Show sources" aria-controls="sources-panel" aria-expanded={sourcesOpen} title="Sources (Ctrl .)">
            <PanelRight className="w-4 h-4" />
          </button>
        </header>

        {offline && (
          <div className="flex items-start sm:items-center gap-3 px-4 sm:px-5 py-2.5 bg-bad-soft text-bad text-[13px] border-b border-line flex-shrink-0" role="alert">
            <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <p className="flex-1">Can't reach the NotebookLLM server. It may be waking up, which can take a minute.</p>
            <button type="button" className="inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline flex-shrink-0" onClick={() => backend.refresh()}>
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-[760px] px-4 sm:px-6">
            {showOnboarding ? (
              <OnboardingState upload={upload} onFile={requestUpload} offline={offline} onRetryConnection={() => backend.refresh()} />
            ) : messages.length === 0 && !typing ? (
              <ReadyState docInfo={docInfo} onAsk={(q) => ask(q)} disabled={!canAsk} />
            ) : (
              <div className="py-6 sm:py-8 space-y-8" aria-live="polite">
                {messages.map((m, i) => (
                  <ChatMessage
                    key={m.id}
                    message={m}
                    isLast={i === messages.length - 1}
                    busy={typing || !canAsk}
                    onRegenerate={regenerate}
                    onCite={cite}
                    onShowSources={showSources}
                    isActive={activeMessage?.id === m.id}
                    activeCite={highlight?.msgId === m.id ? highlight.index : null}
                  />
                ))}
                {typing && <TypingIndicator since={pendingSince} />}
              </div>
            )}
          </div>
        </div>

        <Composer inputRef={composerRef} onSend={(q) => ask(q)} busy={typing} disabled={!canAsk} placeholder={placeholder} />
      </main>

      <SourcesPanel
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        docInfo={docInfo}
        docState={docState}
        backend={backend}
        upload={upload}
        onFile={requestUpload}
        onRemove={askRemove}
        justIndexed={justIndexed}
        activeMessage={activeMessage}
        activeQuestion={activeQuestion}
        highlight={highlight}
        uploadInMain={showOnboarding && !offline}
      />

      <ConfirmDialog
        key={confirm?.title ?? "closed"}
        open={Boolean(confirm)}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone}
        onConfirm={confirm?.onConfirm ?? (() => {})}
        onCancel={() => setConfirm(null)}
        secondary={confirm?.secondary}
      />
    </div>
  );
}
