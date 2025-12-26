import React from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { ScreenType } from "@/types";

const NAV_ITEMS: Array<{ screen: ScreenType; label: (t: any) => string; icon: string }> = [
  { screen: "home", label: (t) => t.home, icon: "🏠" },
  { screen: "transactions", label: (t) => t.transactions, icon: "📊" },
  { screen: "limits", label: (t) => t.limits, icon: "🎯" },
  { screen: "settings", label: (t) => t.settings, icon: "⚙️" },
];

interface BottomNavProps {
  onAddClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onAddClick }) => {
  const { t, activeScreen, setActiveScreen } = useApp();
  
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner px-2 py-2">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavButton
              key={item.screen}
              icon={item.icon}
              label={item.label(t)}
              isActive={activeScreen === item.screen}
              onClick={() => setActiveScreen(item.screen)}
            />
          ))}
          
          {/* Center Add Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onAddClick}
            className="w-14 h-14 -mt-6 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-button"
          >
            <span className="text-2xl">+</span>
          </motion.button>
          
          {NAV_ITEMS.slice(2).map((item) => (
            <NavButton
              key={item.screen}
              icon={item.icon}
              label={item.label(t)}
              isActive={activeScreen === item.screen}
              onClick={() => setActiveScreen(item.screen)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
};

interface NavButtonProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className="flex flex-col items-center gap-1 px-4 py-2"
  >
    <span className={`text-xl transition-transform ${isActive ? "scale-110" : ""}`}>{icon}</span>
    <span className={`text-2xs font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
      {label}
    </span>
  </motion.button>
);
