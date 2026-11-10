import { useEffect, useRef, useState } from "react";
import { BookOpen, Keyboard, MessageSquare, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Plus, Quote, Settings, Sun, X } from "lucide-react";
import { FileIcon, LogoMark } from "./Brand";
import { API_BASE_URL } from "../lib/api";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const SHORTCUTS = [
  ["/", "Focus the question box"],
  ["Ctrl B", "Collapse the sidebar"],
  ["Ctrl .", "Show or hide sources"],
  ["Esc", "Close panels"],
];

const DOC_DOT = {
  ready: "text-ok",
  "ready-unknown": "text-ok",
  missing: "text-warn",
  unverified: "text-warn",
  checking: "text-muted",
};

function SettingsMenu({ theme, setTheme, backend, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const host = (() => { try { return new URL(API_BASE_URL).host; } catch { return API_BASE_URL; } })();

  return (
    <div ref={ref} role="dialog" aria-label="Settings" className="absolute bottom-full left-2 mb-2 w-[280px] panel shadow-lg p-3 z-20 anim-pop origin-bottom-left">
      <p className="section-title px-1 mb-2">Appearance</p>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-sunken p-1" role="radiogroup" aria-label="Theme">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <button key={value} type="button" role="radio" aria-checked={theme === value} onClick={() => setTheme(value)}
            className={`h-8 rounded-md inline-flex items-center justify-center gap-1.5 text-[12.5px] font-medium transition-colors ${theme === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <p className="section-title px-1 mt-4 mb-2">Server</p>
      <dl className="px-1 space-y-1.5 text-[12.5px]">
        <div className="flex justify-between gap-3"><dt className="text-muted">Address</dt><dd className="text-ink truncate" title={API_BASE_URL}>{host}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Status</dt><dd className="text-ink capitalize">{backend.phase}</dd></div>
        {backend.phase === "online" && <div className="flex justify-between gap-3"><dt className="text-muted">Vectors stored</dt><dd className="text-ink tabular-nums">{backend.vectorsStored.toLocaleString()}</dd></div>}
      </dl>
      <button type="button" className="btn btn-ghost btn-sm w-full mt-2" onClick={() => backend.refresh()}>Check connection</button>

      <p className="section-title px-1 mt-3 mb-2 flex items-center gap-1.5"><Keyboard className="w-3.5 h-3.5" aria-hidden="true" />Shortcuts</p>
      <ul className="px-1 space-y-1.5">
        {SHORTCUTS.map(([k, d]) => (
          <li key={k} className="flex items-center justify-between gap-3 text-[12.5px] text-ink-2">
            {d}
            <span className="flex gap-1">{k.split(" ").map((p) => <kbd key={p} className="kbd">{p}</kbd>)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar({
  collapsed, onToggleCollapse, open, onClose, notebookTitle, messageCount, docInfo, docState,
  onNewNotebook, onOpenSources, sourcesOpen, theme, setTheme, backend,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasDoc = docInfo || docState === "ready-unknown";
  const tip = (label) => (collapsed ? label : undefined);

  return (
    <aside className={`sidebar flex-shrink-0 flex flex-col h-full ${collapsed ? "is-collapsed" : ""} ${open ? "is-open" : ""}`} aria-label="Workspace">
      <div className={`h-14 flex items-center gap-2.5 flex-shrink-0 ${collapsed ? "md:justify-center px-3 md:px-0" : "px-3"}`}>
        <LogoMark size={28} />
        <span className="nav-label text-[15px] font-semibold tracking-[-0.01em] text-ink">NotebookLLM</span>
        <button type="button" className="icon-btn ml-auto md:hidden" onClick={onClose} aria-label="Close menu"><X className="w-4 h-4" /></button>
        {!collapsed && (
          <button type="button" className="icon-btn ml-auto hidden md:inline-flex" onClick={onToggleCollapse} aria-label="Collapse sidebar" title="Collapse sidebar (Ctrl B)">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-2 flex-shrink-0">
        {collapsed && (
          <button type="button" className="nav-item hidden md:flex mb-1" onClick={onToggleCollapse} aria-label="Expand sidebar" title="Expand sidebar (Ctrl B)">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
        <button type="button" onClick={onNewNotebook} title={tip("New notebook")}
          className={`btn btn-secondary w-full ${collapsed ? "md:!w-10 md:!px-0 md:mx-auto md:flex" : "justify-start"}`}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span className="nav-label">New notebook</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pt-5 pb-3 space-y-5" aria-label="Notebook">
        <div className="space-y-0.5">
          <p className="nav-label section-title px-2.5 mb-1.5">Workspace</p>
          <button type="button" className="nav-item" aria-current="page" title={tip("Chat")} onClick={onClose}>
            <MessageSquare className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="nav-label flex-1 truncate">Chat</span>
            {messageCount > 0 && <span className="nav-label text-[11.5px] text-muted tabular-nums">{messageCount}</span>}
          </button>
          <button type="button" className="nav-item wide:hidden" title={tip("Sources")} onClick={onOpenSources} aria-expanded={sourcesOpen} aria-controls="sources-panel">
            <Quote className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="nav-label flex-1">Sources</span>
          </button>
        </div>

        <div className="space-y-0.5">
          <p className="nav-label section-title px-2.5 mb-1.5">Notebook</p>
          <div className="nav-item cursor-default hover:!bg-transparent" title={tip(notebookTitle)}>
            <BookOpen className="w-4 h-4 flex-shrink-0 text-accent-text" aria-hidden="true" />
            <span className="nav-label flex-1 truncate text-ink font-medium">{notebookTitle}</span>
          </div>
        </div>

        <div className="space-y-0.5">
          <p className="nav-label section-title px-2.5 mb-1.5">Documents</p>
          {hasDoc ? (
            <button type="button" className="nav-item" onClick={onOpenSources} title={tip(docInfo?.originalName || docInfo?.fileName || "Indexed document")}>
              <FileIcon ext={docInfo?.fileType} size="sm" />
              <span className="nav-label flex-1 truncate">{docInfo?.originalName || docInfo?.fileName || "Indexed document"}</span>
              <span className={`nav-label dot ${DOC_DOT[docState] ?? "text-muted"}`} aria-label={docState} />
            </button>
          ) : (
            <p className="nav-label px-2.5 text-[12.5px] text-muted leading-relaxed">No document yet. Upload one to start asking questions.</p>
          )}
        </div>
      </nav>

      <div className="relative px-2 py-2 border-t border-line flex-shrink-0">
        {settingsOpen && <SettingsMenu theme={theme} setTheme={setTheme} backend={backend} onClose={() => setSettingsOpen(false)} />}
        <button type="button" className="nav-item" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen} aria-haspopup="dialog" title={tip("Settings")}>
          <Settings className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="nav-label flex-1">Settings</span>
          <span className={`nav-label dot ${backend.phase === "online" ? "text-ok" : backend.phase === "offline" ? "text-bad" : "text-muted"}`} aria-label={`Server ${backend.phase}`} />
        </button>
      </div>
    </aside>
  );
}
