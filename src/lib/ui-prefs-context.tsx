import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type TextSize = "sm" | "md" | "lg";
export type Density = "compact" | "comfortable";

type UIPrefs = {
  theme: Theme;
  textSize: TextSize;
  density: Density;
  setTheme: (t: Theme) => void;
  setTextSize: (s: TextSize) => void;
  setDensity: (d: Density) => void;
};

const Ctx = createContext<UIPrefs | undefined>(undefined);
const KEY = "nimbus.ui-prefs.v1";

function load(): { theme: Theme; textSize: TextSize; density: Density } {
  if (typeof window === "undefined")
    return { theme: "dark", textSize: "md", density: "comfortable" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { theme: "dark", textSize: "md", density: "comfortable", ...JSON.parse(raw) };
  } catch {}
  return { theme: "dark", textSize: "md", density: "comfortable" };
}

export function UIPrefsProvider({ children }: { children: ReactNode }) {
  const initial = load();
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [textSize, setTextSize] = useState<TextSize>(initial.textSize);
  const [density, setDensity] = useState<Density>(initial.density);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    root.dataset.density = density;
    root.style.fontSize = textSize === "sm" ? "14px" : textSize === "lg" ? "18px" : "16px";
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ theme, textSize, density }));
    } catch {}
  }, [theme, textSize, density]);

  return (
    <Ctx.Provider value={{ theme, textSize, density, setTheme, setTextSize, setDensity }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUIPrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUIPrefs must be used inside <UIPrefsProvider>");
  return v;
}