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
  ink: "#211f1c",
  bronze: "#9f7d60",
  accent: "#b3937a",
  muted: "#6d665c",
  border: "#e3ddd3",
  surface: "#faf7f1",
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
    ink: toHsl(style.getPropertyValue("--foreground"), FALLBACK.ink),
    bronze: toHsl(style.getPropertyValue("--livora-bronze"), FALLBACK.bronze),
    accent: toHsl(style.getPropertyValue("--accent"), FALLBACK.accent),
    muted: toHsl(style.getPropertyValue("--muted-foreground"), FALLBACK.muted),
    border: toHsl(style.getPropertyValue("--border"), FALLBACK.border),
    surface: toHsl(style.getPropertyValue("--background"), FALLBACK.surface),
    isDark: document.documentElement.classList.contains("dark"),
  };
}

/**
 * Warna tema (hsl string siap pakai untuk three.Color maupun SVG) yang ikut
 * berubah ketika class `dark` dipasang/dilepas di <html>.
 */
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
