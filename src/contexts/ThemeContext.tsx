import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "night" | "day";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("exhibit-theme");
    return (stored as Theme) || "night";
  });

  useEffect(() => {
    localStorage.setItem("exhibit-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    
    if (theme === "day") {
      document.documentElement.classList.add("day-theme");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.remove("day-theme");
      document.documentElement.classList.add("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "night" ? "day" : "night");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
