import { useEffect, useRef, useState } from "react";
import { Send, Trash2, BookOpen, FileUp, X } from "lucide-react";
import { UploadZone } from "./components/UploadZone";
import { ChatMessage, TypingIndicator } from "./components/ChatMessage";
import { sendChat, getStatus, deleteDocument } from "./lib/api";

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  const set = (newVal) => {
    setValue(newVal);
    try { localStorage.setItem(key, JSON.stringify(newVal)); } catch {}
  };

  return [value, set];
}

export default function App() {
  const [messages, setMessages] = useLocalStorage("rag_messages", []);
  const [docInfo, setDocInfo]   = useLocalStorage("rag_doc_info", null);
  const [docReady, setDocReady] = useState(false);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const chatEndRef              = useRef(null);
  const textareaRef             = useRef(null);

  // Always-fresh ref so async callbacks never read stale messages state
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // On every mount: ask Qdrant if vectors exist.
  // - If YES: restore docReady so the user can keep chatting without re-uploading.
  // - If NO:  wipe messages + docInfo — stored context is invalid, don't show it.
  useEffect(() => {
    getStatus()
      .then((s) => {
        if (s.ready) {
          setDocReady(true);
        } else {
          setDocReady(false);
          setMessages([]);
          setDocInfo(null);
        }
      })
      .catch(() => {
        setDocReady(false);
        setMessages([]);
        setDocInfo(null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleUploadSuccess = (info) => {
    setDocInfo(info);
    setDocReady(true);
    setMessages([]);
  };

  // Clears only the chat history — document stays indexed in Qdrant
  const clearChat = () => setMessages([]);

  // Removes document: deletes Qdrant vectors first, then clears all local state
  const removeDocument = async () => {
    try { await deleteDocument(); } catch { /* best-effort */ }
    setMessages([]);
    setDocInfo(null);
    setDocReady(false);
  };

  const sendMessage = async (text) => {
    const query = (text ?? input).trim();
    if (!query || !docReady || typing) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";

    // Build snapshot synchronously so we can append assistant reply to the exact same array.
    // This fixes the "first message disappears" stale-closure bug.
    const userMsg  = { role: "user", content: query, id: Date.now() };
    const snapshot = [...messagesRef.current, userMsg];
    setMessages(snapshot);

    setTyping(true);
    try {
      // History from ref (always current), excludes the message we just sent
      const history = messagesRef.current
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await sendChat(query, history);
      setMessages([
        ...snapshot,
        { role: "assistant", content: result.answer, sources: result.sources, id: Date.now() + 1 },
      ]);
    } catch (e) {
      const errMsg = e.response?.data?.error || "Something went wrong.";
      // Backend says no document → wipe state so UI is consistent
      if (errMsg.includes("Upload a document")) {
        setDocReady(false);
        setDocInfo(null);
        setMessages([]);
        return;
      }
      setMessages([
        ...snapshot,
        { role: "assistant", content: errMsg, id: Date.now() + 1 },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-72 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <BookOpen style={{ width: "18px", height: "18px" }} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none tracking-tight">NotebookRAG</h1>
              <p className="text-gray-500 text-xs mt-0.5">Document intelligence</p>
            </div>
          </div>
        </div>

        {/* Upload zone */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <FileUp className="w-3.5 h-3.5 text-gray-500" />
            <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Upload</p>
          </div>
          <UploadZone onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Indexed doc info */}
        {docInfo && (
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${docReady ? "bg-emerald-400" : "bg-amber-400"}`} />
                <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">
                  {docReady ? "Indexed" : "Unavailable"}
                </p>
              </div>
              <button
                onClick={removeDocument}
                className="text-gray-600 hover:text-red-400 transition-colors"
                title="Remove document"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { label: "File",   value: docInfo.fileName,               cls: "text-gray-300 truncate max-w-[130px]" },
                { label: "Type",   value: docInfo.fileType?.toUpperCase(), cls: "text-violet-400" },
                { label: "Chunks", value: docInfo.totalChunks,            cls: "text-gray-300" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex justify-between items-center py-1.5 px-3 bg-gray-800/60 rounded-lg">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className={`text-xs font-mono ${cls}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto px-4 py-4 border-t border-gray-800">
          <p className="text-gray-700 text-xs text-center">Powered by Groq + Qdrant</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-sm">
              {docInfo ? docInfo.fileName : "No document loaded"}
            </h2>
            <p className="text-gray-600 text-xs mt-0.5">
              {docReady
                ? `${docInfo?.totalChunks} chunks · ready`
                : docInfo
                  ? "Index unavailable — re-upload to continue"
                  : "Upload a document to start chatting"}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-400/10"
            >
              <Trash2 className="w-3 h-3" />
              Clear chat
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && !typing && (
            <div className="h-full flex flex-col items-center justify-center text-center select-none">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center mb-6">
                <BookOpen className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-white text-2xl font-bold mb-2 tracking-tight">
                {docReady ? "Ready to answer" : "Start by uploading"}
              </h2>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                {docReady
                  ? "Ask anything about your document. Every answer is grounded in its content."
                  : "Upload a PDF, TXT, or CSV from the sidebar. I'll index it and answer your questions."}
              </p>
            </div>
          )}

          {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
          {typing && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 px-6 py-4 bg-gray-950 border-t border-gray-800">
          <div className={`flex items-end gap-3 rounded-2xl border p-3 transition-all duration-200 ${
            docReady
              ? "bg-gray-900 border-gray-700 focus-within:border-violet-500/70 focus-within:shadow-lg focus-within:shadow-violet-500/10"
              : "bg-gray-900/50 border-gray-800 opacity-60"
          }`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!docReady || typing}
              placeholder={docReady ? "Ask anything about your document…" : "Upload a document first…"}
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-gray-200 placeholder-gray-600 outline-none leading-relaxed disabled:cursor-not-allowed"
              style={{ minHeight: "24px", maxHeight: "128px" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!docReady || !input.trim() || typing}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                docReady && input.trim() && !typing
                  ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/30 hover:scale-105"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              <Send style={{ width: "15px", height: "15px" }} />
            </button>
          </div>
          <p className="text-gray-700 text-xs text-center mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </main>
    </div>
  );
}