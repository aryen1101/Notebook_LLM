import { useRef } from "react";

/** Hidden file input + trigger, shared by the dropzone and "Replace" buttons. */
export function useFilePicker(onFile) {
  const inputRef = useRef(null);
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow picking the same file again
        if (file) onFile(file);
      }}
    />
  );
  return { open: () => inputRef.current?.click(), input };
}
