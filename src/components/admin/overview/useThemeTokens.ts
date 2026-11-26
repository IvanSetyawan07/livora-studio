import { useEffect, useState } from "react";

export type ThemeTokens = {
  ink: string;
  bronze: string;
  accent: string;
  muted: string;
  border: string;
  surface: string;
  isDark: boolean;
};

const FALLBACK: ThemeTokens = {
  ink: "#232528",
  bronze: "#5E93B8", // LIVORA Morning Sky (kept key name `bronze` for backwards compatibility)
  accent: "#88B2CF", // Soft Morning Sky
  muted: "#656B73",  // Architectural Slate
  border: "#EAE4DA",
  surface: "#FAF8F4",
  isDark: false,
};

/** "--foreground: 30 8% 12%" -> "hsl(30, 8%, 12%)" */
const toHsl = (rawValue: string, fallback: string) => {
  const raw = rawValue.trim();
  if (!raw) return fallback;
  const parts = raw.split(/\s+/);
  if (parts.length < 3) return `hsl(${raw})`;
  return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
};

function readThemeTokens(): ThemeTokens {
  if (typeof window === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  return {
    ink: "#232528",
    bronze: toHsl(style.getPropertyValue("--livora-sky"), FALLBACK.bronze),
    accent: FALLBACK.accent,
    muted: toHsl(style.getPropertyValue("--livora-slate"), FALLBACK.muted),
    border: FALLBACK.border,
    surface: toHsl(style.getPropertyValue("--livora-limestone"), FALLBACK.surface),
    isDark: false,
  };
}

export function useThemeTokens(): ThemeTokens {
  const [tokens, setTokens] = useState<ThemeTokens>(() => readThemeTokens());

  useEffect(() => {
    const sync = () => setTokens(readThemeTokens());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return tokens;
}
