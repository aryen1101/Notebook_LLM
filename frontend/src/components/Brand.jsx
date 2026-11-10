import { File, FileSpreadsheet, FileText } from "lucide-react";

/** Mark: a page with a citation dot on its corner. */
export function LogoMark({ size = 28, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M10 9.5h9.5a2.5 2.5 0 0 1 2.5 2.5v10.5H12.5A2.5 2.5 0 0 1 10 20V9.5Z" fill="var(--accent-ink)" />
      <path d="M13 13h6M13 16h4" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="22" cy="22.5" r="3.5" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}

const FILE_STYLES = {
  pdf: { icon: FileText, bg: "var(--bad-soft)", fg: "var(--bad)" },
  csv: { icon: FileSpreadsheet, bg: "var(--ok-soft)", fg: "var(--ok)" },
  txt: { icon: FileText, bg: "var(--accent-soft)", fg: "var(--accent-text)" },
};

export function FileIcon({ ext, size = "md" }) {
  const style = FILE_STYLES[ext] ?? { icon: File, bg: "var(--sunken)", fg: "var(--muted)" };
  const Icon = style.icon;
  const box = size === "sm" ? "w-7 h-7 rounded-md" : "w-10 h-10 rounded-lg";
  const glyph = size === "sm" ? "w-3.5 h-3.5" : "w-[18px] h-[18px]";
  return (
    <span className={`${box} inline-flex items-center justify-center flex-shrink-0`} style={{ background: style.bg, color: style.fg }}>
      <Icon className={glyph} aria-hidden="true" />
    </span>
  );
}
