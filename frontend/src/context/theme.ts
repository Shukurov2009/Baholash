import { useEffect, useState } from "react";

const KEY = "baholash_theme";

function initial(): boolean {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved === "dark";
  } catch {
    /* e'tiborsiz */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** Light/dark rejim: <html> ga "dark" klassini qo'shadi va tanlovni eslab qoladi. */
export function useTheme() {
  const [dark, setDark] = useState<boolean>(initial);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {
      /* e'tiborsiz */
    }
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}
