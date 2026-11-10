import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

/**
 * Modal confirmation. onConfirm may be async; if it throws, the error message is
 * shown in the dialog and it stays open. `secondary` offers an alternate action.
 */
export function ConfirmDialog({ open, title, body, confirmLabel, tone = "danger", onConfirm, onCancel, secondary }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // App remounts this component (key) for each new confirmation, so state starts fresh.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => cancelRef.current?.focus(), 20);
    const onKey = (e) => e.key === "Escape" && onCancelRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e?.message || "That didn't work. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="backdrop" onClick={busy ? undefined : onCancel} aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body" className="relative z-[61] w-full max-w-[420px] panel shadow-lg p-5 anim-pop">
        <h2 id="confirm-title" className="text-[16px] font-semibold text-ink">{title}</h2>
        <div id="confirm-body" className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{body}</div>
        {error && (
          <p className="mt-3 text-[13px] text-bad bg-bad-soft rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          {error && secondary && (
            <button type="button" className="btn btn-ghost mr-auto" onClick={secondary.onClick}>
              {secondary.label}
            </button>
          )}
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`} onClick={run} disabled={busy}>
            {busy && <LoaderCircle className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
