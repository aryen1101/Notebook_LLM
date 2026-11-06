import { useEffect, useRef, useState } from "react";
import { Activity, BookOpen, FileUp, Languages, Layers, Menu, Send, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { UploadZone } from "./components/UploadZone";
import { ChatMessage, TypingIndicator } from "./components/ChatMessage";
import { StatusBar } from "./components/StatusBar";
import { sendChat, getStatus, deleteDocument } from "./lib/api";

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => { try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : initial; } catch { return initial; } });
  const set = (newVal) => { setValue(newVal); try { localStorage.setItem(key, JSON.stringify(newVal)); } catch { /* storage is optional */ } };
  return [value, set];
}

export default function App() {
  const [messages, setMessages] = useLocalStorage("rag_messages", []);
  const [docInfo, setDocInfo] = useLocalStorage("rag_doc_info", null);
  const [docReady, setDocReady] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesRef = useRef(messages);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { getStatus().then((s) => setDocReady(s.ready)).catch(() => setDocReady(false)); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const handleUploadSuccess = (info) => { setDocInfo(info); setDocReady(true); setMessages([]); setSidebarOpen(false); };
  const removeDocument = async () => { try { await deleteDocument(); } catch { /* clear local state even if the backend is unavailable */ } setMessages([]); setDocInfo(null); setDocReady(false); };
  const sendMessage = async () => {
    const query = input.trim(); if (!query || typing) return;
    setInput(""); if (textareaRef.current) textareaRef.current.style.height = "24px";
    const userMsg = { role: "user", content: query, id: Date.now() }; const snapshot = [...messagesRef.current, userMsg]; setMessages(snapshot); setTyping(true);
    try {
      const history = messagesRef.current.slice(-8).map((m) => ({ role: m.role, content: m.content })); const result = await sendChat(query, history);
      setMessages([...snapshot, { role: "assistant", content: result.answer, sources: result.sources, judgment: result.judgment, rewrittenQuery: result.rewrittenQuery, subQueries: result.subQueries, language: result.language, id: Date.now() + 1 }]);
    } catch (e) { setMessages([...snapshot, { role: "assistant", content: e.response?.data?.error || "Something went wrong. Please try again.", id: Date.now() + 1 }]); } finally { setTyping(false); }
  };
  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div className="app-shell h-screen flex overflow-hidden">
      {sidebarOpen && <button aria-label="Close navigation" className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`app-sidebar w-72 flex-shrink-0 flex flex-col ${sidebarOpen ? "is-open" : ""}`}>
        <div className="px-5 py-5 border-b border-white/8"><div className="flex items-center gap-3"><div className="brand-mark w-9 h-9 rounded-xl flex items-center justify-center"><BookOpen className="w-[18px] h-[18px] text-white" /></div><div><h1 className="text-white font-semibold text-base leading-none tracking-tight">NotebookLLM</h1><p className="text-slate-500 text-xs mt-1">Your document workspace</p></div><button aria-label="Close sidebar" className="ml-auto mobile-only text-slate-500 hover:text-white" onClick={() => setSidebarOpen(false)}><X className="w-4 h-4" /></button></div></div>
        <div className="p-4 pt-6"><div className="flex items-center gap-2 mb-3"><FileUp className="w-3.5 h-3.5 text-violet-300" /><p className="source-heading">Source document</p></div><UploadZone onUploadSuccess={handleUploadSuccess} docReady={docReady} onRemove={removeDocument} docInfo={docInfo} /></div>
        <div className="mt-auto px-4 py-4 border-t border-white/8"><div className="flex items-center gap-2 text-slate-600 text-xs"><Activity className="w-3.5 h-3.5 text-emerald-400" /><span>AI pipeline online</span></div><p className="text-slate-700 text-[11px] mt-2">Groq · Qdrant · LLM-as-judge</p></div>
      </aside>
      <main className="app-main flex-1 flex flex-col overflow-hidden">
        <div className="topbar flex-shrink-0 px-4 sm:px-8 py-4 flex items-center justify-between"><div><div className="flex items-center gap-3"><button aria-label="Open navigation" className="mobile-only text-slate-400 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button><h2 className="text-white font-semibold text-sm">{docReady && docInfo ? docInfo.fileName : "NotebookLLM"}</h2></div><p className="text-slate-500 text-xs mt-1 ml-8 sm:ml-0">{docReady ? `${docInfo?.totalChunks} chunks indexed · answers grounded in document` : "Upload a source to start a grounded conversation"}</p></div><div className="flex items-center gap-3"><div className="hidden sm:block"><StatusBar refreshTrigger={docReady} /></div>{messages.length > 0 && <button onClick={() => setMessages([])} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-400/10"><Trash2 className="w-3 h-3" />Clear chat</button>}</div></div>
        <div className="chat-scroll flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">{messages.length === 0 && !typing && <div className="empty-state h-full flex flex-col items-center justify-center text-center select-none"><div className="empty-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-5"><Sparkles className="w-7 h-7 text-violet-300" /></div><h2 className="text-white text-2xl sm:text-3xl font-semibold mb-3 tracking-tight">{docReady ? "Ready to answer" : "Ask better questions"}</h2><p className="text-slate-500 text-sm max-w-md leading-relaxed">{docReady ? "Ask anything about your document. Answers are grounded in its content and checked before you see them." : "Upload a PDF, TXT, or CSV and turn it into a clear, searchable knowledge base."}</p><div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-lg">{[{ icon: Languages, label: "Multilingual" }, { icon: Layers, label: "Sub-query retrieval" }, { icon: ShieldCheck, label: "Grounded & verified" }].map(({ icon: Icon, label }) => <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full feature-pill text-slate-400 text-xs"><Icon className="w-3.5 h-3.5 text-violet-300" />{label}</span>)}</div></div>}{messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}{typing && <TypingIndicator />}<div ref={chatEndRef} /></div>
        <div className="composer-wrap flex-shrink-0 px-4 sm:px-8 py-4"><div className="composer flex items-end gap-3 rounded-2xl border p-3 transition-all duration-200 focus-within:border-violet-500/70"><textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={typing} placeholder={docReady ? "Ask anything about your document…" : "Upload a document to begin…"} rows={1} className="flex-1 bg-transparent resize-none text-sm text-slate-200 placeholder-slate-600 outline-none leading-relaxed disabled:cursor-not-allowed" style={{ minHeight: "24px", maxHeight: "128px" }} onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px"; }} /><button aria-label="Send message" onClick={sendMessage} disabled={!input.trim() || typing} className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${input.trim() && !typing ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/30 hover:scale-105" : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}><Send className="w-[15px] h-[15px]" /></button></div><p className="text-slate-600 text-xs text-center mt-2">Enter to send · Shift+Enter for new line</p></div>
      </main>
    </div>
  );
}
