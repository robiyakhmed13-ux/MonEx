import React, { memo } from "react";
import { useApp } from "@/context/AppContext";
import { Home, Activity, Brain, Calendar, Plus } from "lucide-react";
import { ScreenType } from "@/types";

/**
 * Premium Bottom Navigation - iOS 18 Style
 * - 5 tabs: Home, Activity, +, AI, Planning
 * - Icon + label only
 * - Selected tab = subtle primary tint
 * - Floating + button (premium style)
 * - iOS-approved animations only (fade, no bounce)
 */

interface NavItem {
  id: ScreenType;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}

// Premium 5-tab structure: Home → awareness, Activity → history, + → action, AI → guidance, Planning → future
const NAV_ITEMS: NavItem[] = [
  { id: "home", icon: Home, labelKey: "home" },
  { id: "transactions", icon: Activity, labelKey: "activity" },
  { id: "ai", icon: Brain, labelKey: "ai" },
  { id: "goals", icon: Calendar, labelKey: "planning" }, // Using goals screen as planning entry
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
      planning: { uz: "Rejalashtirish", ru: "Планирование", en: "Planning" },
      ai: { uz: "AI", ru: "AI", en: "AI" },
    };
    return labels[key]?.[lang] || labels[key]?.en || key;
  };

  // Map screens to nav items for highlighting
  const getActiveNav = (screen: ScreenType): ScreenType => {
    if (screen === "home") return "home";
    if (screen === "transactions") return "transactions";
    if (["ai", "debt-assessment", "cash-flow", "net-worth", "investments"].includes(screen)) return "ai";
    // Planning tab: more, goals, limits, analytics, accounts, reports, subscriptions, recurring, bill-split, envelopes, debt-payoff, settings
    if (["more", "goals", "limits", "analytics", "accounts", "reports", "subscriptions", "recurring", "bill-split", "envelopes", "debt-payoff", "settings"].includes(screen)) return "more";
    return "home";
  };

  const activeNav = getActiveNav(activeScreen);

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2 py-2">
        {/* Home */}
        {(() => {
          const item = NAV_ITEMS[0];
          const Icon = item.icon;
          const isActive = "home" === activeNav;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen("home")}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="bottom-nav-item-icon" />
              <span className="bottom-nav-item-label">{getLabel(item.labelKey)}</span>
            </button>
          );
        })()}

        {/* Activity */}
        {(() => {
          const item = NAV_ITEMS[1];
          const Icon = item.icon;
          const isActive = "transactions" === activeNav;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen("transactions")}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="bottom-nav-item-icon" />
              <span className="bottom-nav-item-label">{getLabel(item.labelKey)}</span>
            </button>
          );
        })()}

        {/* Premium Floating Add Button */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 -mt-6 rounded-[1.25rem] bg-primary text-primary-foreground flex items-center justify-center shadow-elevated active:opacity-80 transition-opacity"
          aria-label="Add transaction"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* AI */}
        {(() => {
          const item = NAV_ITEMS[2];
          const Icon = item.icon;
          const isActive = "ai" === activeNav;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen("ai")}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="bottom-nav-item-icon" />
              <span className="bottom-nav-item-label">{getLabel(item.labelKey)}</span>
            </button>
          );
        })()}

        {/* Planning */}
        {(() => {
          const item = NAV_ITEMS[3];
          const Icon = item.icon;
          const isActive = "more" === activeNav || ["goals", "limits", "analytics", "accounts", "reports", "subscriptions", "recurring", "bill-split", "envelopes", "debt-payoff", "settings"].includes(activeScreen);
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen("more")}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="bottom-nav-item-icon" />
              <span className="bottom-nav-item-label">{getLabel(item.labelKey)}</span>
            </button>
          );
        })()}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
