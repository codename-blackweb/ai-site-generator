import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full glass-panel flex items-center justify-center group"
      aria-label={`Switch to ${theme === 'night' ? 'day' : 'night'} theme`}
    >
      <motion.div
        initial={false}
        animate={{ 
          scale: theme === "night" ? 1 : 0,
          opacity: theme === "night" ? 1 : 0,
          rotate: theme === "night" ? 0 : -90,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Moon className="w-4 h-4 text-foreground" />
      </motion.div>
      
      <motion.div
        initial={false}
        animate={{ 
          scale: theme === "day" ? 1 : 0,
          opacity: theme === "day" ? 1 : 0,
          rotate: theme === "day" ? 0 : 90,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Sun className="w-4 h-4 text-foreground" />
      </motion.div>
    </button>
  );
}
