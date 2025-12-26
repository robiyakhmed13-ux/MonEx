import React from "react";
import { motion } from "framer-motion";

interface ThemeToggleProps {
  theme: "light" | "dark" | "system";
  onChange: (theme: "light" | "dark" | "system") => void;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onChange, compact = false }) => {
  if (compact) {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(theme === "dark" ? "light" : "dark")}
        className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center relative overflow-hidden"
      >
        <motion.div
          animate={{ 
            rotate: theme === "dark" ? 0 : 180,
            scale: [1, 0.8, 1]
          }}
          transition={{ duration: 0.5 }}
        >
          {theme === "dark" ? (
            <motion.span 
              className="text-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              🌙
            </motion.span>
          ) : (
            <motion.span 
              className="text-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ☀️
            </motion.span>
          )}
        </motion.div>
      </motion.button>
    );
  }

  return (
    <div className="flex gap-2 p-1 bg-secondary rounded-2xl">
      {[
        { value: "light" as const, icon: "☀️", label: "Light" },
        { value: "dark" as const, icon: "🌙", label: "Dark" },
        { value: "system" as const, icon: "💻", label: "Auto" },
      ].map((option) => (
        <motion.button
          key={option.value}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(option.value)}
          className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
            theme === option.value
              ? "bg-card text-foreground shadow-md"
              : "text-muted-foreground"
          }`}
        >
          <span className="text-lg">{option.icon}</span>
          <span className="text-sm">{option.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default ThemeToggle;
