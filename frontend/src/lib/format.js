export const ACCEPTED_EXTENSIONS = ["pdf", "txt", "csv"];
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function fileExtension(name = "") {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function validateFile(file) {
  if (!file) return "No file selected.";
  if (!ACCEPTED_EXTENSIONS.includes(fileExtension(file.name))) {
    return "This file type isn't supported. Upload a PDF, TXT or CSV file.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `This file is ${formatBytes(file.size)}. The limit is 20 MB.`;
  }
  return null;
}

export function formatBytes(bytes) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function relativeTime(ts) {
  if (!ts) return null;
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 45) return "just now";
  const mins = Math.round(diff / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Quarterly_report_1715000000000.pdf" -> "Quarterly report" */
export function displayTitle(fileName = "") {
  const ext = fileExtension(fileName);
  let base = ext ? fileName.slice(0, -(ext.length + 1)) : fileName;
  base = base.replace(/_\d{12,}$/, ""); // server appends a timestamp
  base = base.replace(/[_-]+/g, " ").trim();
  return base || fileName;
}

/**
 * The model is prompted to "cite the Source number", so answers contain
 * phrases like "[Source 2]", "(Source 1)" or "Source 3". Turn the ones that
 * point at a real returned source into markdown links the renderer can show
 * as citation chips. Code blocks are left untouched.
 */
export function linkCitations(text = "", sourceCount = 0) {
  if (!sourceCount) return text;
  const pattern = /\[Source\s+(\d+)\]|\(Source\s+(\d+)\)|\bSource\s+(\d+)\b/g;
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => {
      if (i % 2 === 1) return part; // code
      return part.replace(pattern, (match, a, b, c) => {
        const n = Number(a || b || c);
        if (n < 1 || n > sourceCount) return match;
        return `[${n}](#cite-${n})`;
      });
    })
    .join("");
}

export function citedIndexes(text = "", sourceCount = 0) {
  const found = new Set();
  const pattern = /Source\s+(\d+)/g;
  let m;
  while ((m = pattern.exec(text))) {
    const n = Number(m[1]);
    if (n >= 1 && n <= sourceCount) found.add(n - 1);
  }
  return found;
}

export function describeRequestError(e, fallback) {
  const serverMsg = e?.response?.data?.error;
  if (serverMsg) return serverMsg;
  if (e?.code === "ECONNABORTED") return "The server took too long to respond. It may still be waking up. Try again in a moment.";
  if (!e?.response) return "Couldn't reach the server. Check your connection, or wait a minute for the server to wake up, then try again.";
  return fallback;
}
