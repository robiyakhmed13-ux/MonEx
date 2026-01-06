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

// Tabs: Home → awareness, Activity → history, Goals → planning, AI → guidance, More → everything else
const NAV_ITEMS: NavItem[] = [
  { id: "home", icon: Home, labelKey: "home" },
  { id: "transactions", icon: Activity, labelKey: "activity" },
  { id: "goals", icon: Target, labelKey: "goals" },
  { id: "analytics", icon: Brain, labelKey: "ai" },
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
    if (["goals", "limits"].includes(screen)) return "goals";
    if (["analytics", "reports"].includes(screen)) return "analytics";
    return "more";
  };

  const activeNav = getActiveNav(activeScreen);
  const leftItems = NAV_ITEMS.slice(0, 2);
  const rightItems = NAV_ITEMS.slice(2);

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2 py-2">
        {/* Left items */}
        {leftItems.map((item) => {
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
          className="w-12 h-12 -mt-4 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md active:opacity-80"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Right items */}
        {rightItems.map((item) => {
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