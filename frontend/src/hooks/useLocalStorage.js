import { useCallback, useState } from "react";

/** useState that mirrors to localStorage. Storage is optional; failures are ignored. */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* storage is optional */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
