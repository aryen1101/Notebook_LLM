import { useLayoutEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const MAX_HEIGHT = 200;

export function Composer({ onSend, busy, disabled, placeholder, inputRef }) {
  const [value, setValue] = useState("");

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value, inputRef]);

  const canSend = value.trim().length > 0 && !busy && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="px-3 sm:px-6 pb-3 sm:pb-5 pt-2 flex-shrink-0" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-[760px]">
        <form
          className="composer flex items-end gap-2 p-2 pl-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="composer-input" className="sr-only">Ask a question about your document</label>
          <textarea
            id="composer-input"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={disabled}
            rows={1}
            placeholder={placeholder}
            className="flex-1 min-w-0 resize-none bg-transparent py-2 text-[15px] leading-6 text-ink placeholder:text-muted outline-none disabled:cursor-not-allowed"
            style={{ maxHeight: MAX_HEIGHT }}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send question"
            className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center flex-shrink-0 transition-colors bg-accent text-accent-ink hover:bg-accent-hover disabled:bg-sunken disabled:text-muted disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.25} />
          </button>
        </form>
        <p className="hidden sm:flex items-center justify-center gap-3 mt-2 text-[11.5px] text-muted">
          <span><kbd className="kbd">Enter</kbd> to send</span>
          <span><kbd className="kbd">Shift</kbd> + <kbd className="kbd">Enter</kbd> for a new line</span>
          <span><kbd className="kbd">/</kbd> to focus</span>
        </p>
      </div>
    </div>
  );
}
