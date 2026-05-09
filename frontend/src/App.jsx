import { useEffect, useRef, useState } from "react";
import { Send, Trash2, BookOpen, FileUp } from "lucide-react";
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
  const messagesRef             = useRef(messages);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    getStatus()
      .then((s) => setDocReady(s.ready))
      .catch(() => setDocReady(false));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleUploadSuccess = (info) => {
    setDocInfo(info);
    setDocReady(true);
    setMessages([]);
  };

  const clearChat = () => setMessages([]);

  const removeDocument = async () => {
    try { await deleteDocument(); } catch {}
    setMessages([]);
    setDocInfo(null);
    setDocReady(false);
  };

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || typing) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";

    const userMsg  = { role: "user", content: query, id: Date.now() };
    const snapshot = [...messagesRef.current, userMsg];
    setMessages(snapshot);
    setTyping(true);

    try {
      const history = messagesRef.current
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await sendChat(query, history);
      setMessages([
        ...snapshot,
        { role: "assistant", content: result.answer, sources: result.sources, id: Date.now() + 1 },
      ]);
    } catch (e) {
      setMessages([
        ...snapshot,
        { role: "assistant", content: e.response?.data?.error || "Something went wrong.", id: Date.now() + 1 },
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
      <aside className="w-72 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
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

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileUp className="w-3.5 h-3.5 text-gray-500" />
            <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Upload</p>
          </div>
          <UploadZone
            onUploadSuccess={handleUploadSuccess}
            docReady={docReady}
            onRemove={removeDocument}
            docInfo={docInfo}
          />
        </div>

        <div className="mt-auto px-4 py-4 border-t border-gray-800">
          <p className="text-gray-700 text-xs text-center">Powered by Groq + Qdrant</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-sm">
              {docReady && docInfo ? docInfo.fileName : "NotebookRAG"}
            </h2>
            <p className="text-gray-600 text-xs mt-0.5">
              {docReady
                ? `${docInfo?.totalChunks} chunks indexed · answers grounded in document`
                : "No document loaded · upload a file from the sidebar"}
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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && !typing && (
            <div className="h-full flex flex-col items-center justify-center text-center select-none">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center mb-6">
                <BookOpen className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-white text-2xl font-bold mb-2 tracking-tight">
                {docReady ? "Ready to answer" : "Ask me anything"}
              </h2>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                {docReady
                  ? "Ask anything about your document. Answers are grounded in its content."
                  : "Upload a PDF, TXT, or CSV for document-grounded answers, or just ask a question."}
              </p>
            </div>
          )}
          {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
          {typing && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        <div className="flex-shrink-0 px-6 py-4 bg-gray-950 border-t border-gray-800">
          <div className="flex items-end gap-3 rounded-2xl border p-3 transition-all duration-200 bg-gray-900 border-gray-700 focus-within:border-violet-500/70 focus-within:shadow-lg focus-within:shadow-violet-500/10">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={typing}
              placeholder={docReady ? "Ask anything about your document…" : "Ask me anything…"}
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-gray-200 placeholder-gray-600 outline-none leading-relaxed disabled:cursor-not-allowed"
              style={{ minHeight: "24px", maxHeight: "128px" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || typing}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                input.trim() && !typing
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