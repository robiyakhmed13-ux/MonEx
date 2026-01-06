import React, { memo } from "react";
import { useApp } from "@/context/AppContext";
import { Home, Activity, Brain, Target, MoreHorizontal, Plus } from "lucide-react";
import { ScreenType } from "@/types";

/**
 * Bottom Navigation - Design System Rules:
 * - Icon + label only
 * - Selected tab = subtle tint, not bright
 * - No badges everywhere
 * - No floating buttons over tabs
 * - iOS-approved animations only (fade, no bounce)
 */

interface NavItem {
  id: ScreenType;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}

// Tabs: Home → awareness, Activity → history, AI → guidance, More → everything else
// Goals removed as per design - available in More menu
const NAV_ITEMS: NavItem[] = [
  { id: "home", icon: Home, labelKey: "home" },
  { id: "transactions", icon: Activity, labelKey: "activity" },
  { id: "ai", icon: Brain, labelKey: "ai" },
  { id: "more", icon: MoreHorizontal, labelKey: "more" },
];

interface BottomNavProps {
  onAddClick: () => void;
}

export const BottomNav = memo<BottomNavProps>(({ onAddClick }) => {
  const { activeScreen, setActiveScreen, lang } = useApp();

  const getLabel = (key: string): string => {
    const labels: Record<string, Record<string, string>> = {
      home: { uz: "Bosh", ru: "Главная", en: "Home" },
      activity: { uz: "Faoliyat", ru: "Активность", en: "Activity" },
      goals: { uz: "Maqsadlar", ru: "Цели", en: "Goals" },
      ai: { uz: "AI", ru: "AI", en: "AI" },
      more: { uz: "Ko'proq", ru: "Ещё", en: "More" },
    };
    return labels[key]?.[lang] || labels[key]?.en || key;
  };

  // Map screens to nav items for highlighting
  const getActiveNav = (screen: ScreenType): ScreenType => {
    if (screen === "home") return "home";
    if (screen === "transactions") return "transactions";
    if (["ai", "debt-assessment", "cash-flow", "net-worth", "investments"].includes(screen)) return "ai";
    return "more";
  };

  const activeNav = getActiveNav(activeScreen);

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-4 py-2">
        {/* Left nav items */}
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeNav;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="bottom-nav-item-icon" />
              <span className="bottom-nav-item-label">{getLabel(item.labelKey)}</span>
            </button>
          );
        })}

        {/* Center Add Button */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 -mt-6 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:opacity-80 transition-opacity"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* Right nav items */}
        {NAV_ITEMS.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeNav;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="bottom-nav-item-icon" />
              <span className="bottom-nav-item-label">{getLabel(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;