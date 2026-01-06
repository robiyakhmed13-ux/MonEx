import React from "react";
import { useApp } from "@/context/AppContext";
import { ScreenType } from "@/types";
import { Home, List, Target, LayoutGrid, Plus } from "lucide-react";

/**
 * Bottom Navigation - Design System Rules:
 * - Icon + label only
 * - Selected tab = subtle tint, not bright
 * - No floating buttons over tabs (except center add)
 * - No dramatic animations
 */

interface NavItem {
  screen: ScreenType;
  label: (t: any) => string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { screen: "home", label: (t) => t.home, icon: Home },
  { screen: "transactions", label: (t) => t.transactions, icon: List },
  { screen: "goals", label: (t) => t.goals || "Goals", icon: Target },
  { screen: "more", label: (t) => t.more || "More", icon: LayoutGrid },
];

interface BottomNavProps {
  onAddClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onAddClick }) => {
  const { t, activeScreen, setActiveScreen } = useApp();

  const leftItems = NAV_ITEMS.slice(0, 2);
  const rightItems = NAV_ITEMS.slice(2, 4);

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2 py-2">
        
        {/* Left items */}
        {leftItems.map((item) => (
          <NavButton
            key={item.screen}
            item={item}
            isActive={activeScreen === item.screen}
            onClick={() => setActiveScreen(item.screen)}
            t={t}
          />
        ))}

        {/* Center Add Button */}
        <button
          onClick={onAddClick}
          className="w-12 h-12 -mt-4 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md active:opacity-80 transition-opacity"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Right items */}
        {rightItems.map((item) => (
          <NavButton
            key={item.screen}
            item={item}
            isActive={activeScreen === item.screen}
            onClick={() => setActiveScreen(item.screen)}
            t={t}
          />
        ))}
      </div>
    </nav>
  );
};

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  t: any;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, onClick, t }) => {
  const Icon = item.icon;
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-colors active:opacity-70 ${
        isActive 
          ? 'text-primary bg-primary/8' 
          : 'text-muted-foreground'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{item.label(t)}</span>
    </button>
  );
};