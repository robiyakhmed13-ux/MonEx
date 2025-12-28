import React from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { ScreenType } from "@/types";

interface NavItem {
  screen: ScreenType;
  label: (t: any) => string;
  icon: React.ReactNode;
  gradient: string;
}

// Animated icon components with Revolut-style motion
const AnimatedHomeIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
    transition={{ duration: 0.5, repeat: isActive ? Infinity : 0, repeatDelay: 2 }}
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </motion.svg>
);

const AnimatedTransactionsIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    animate={isActive ? { y: [0, -2, 0] } : {}}
    transition={{ duration: 0.6, repeat: isActive ? Infinity : 0, repeatDelay: 1.5 }}
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <motion.circle 
      cx="4" cy="6" r="2" 
      fill="currentColor"
      animate={isActive ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 0.4, delay: 0 }}
    />
    <motion.circle 
      cx="4" cy="12" r="2" 
      fill="currentColor"
      animate={isActive ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 0.4, delay: 0.1 }}
    />
    <motion.circle 
      cx="4" cy="18" r="2" 
      fill="currentColor"
      animate={isActive ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 0.4, delay: 0.2 }}
    />
  </motion.svg>
);

const AnimatedAnalyticsIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <motion.rect 
      x="3" y="12" width="4" height="9" rx="1"
      animate={isActive ? { height: [9, 12, 9], y: [12, 9, 12] } : {}}
      transition={{ duration: 0.8, repeat: isActive ? Infinity : 0, repeatDelay: 1 }}
    />
    <motion.rect 
      x="10" y="6" width="4" height="15" rx="1"
      animate={isActive ? { height: [15, 10, 15], y: [6, 11, 6] } : {}}
      transition={{ duration: 0.8, delay: 0.2, repeat: isActive ? Infinity : 0, repeatDelay: 1 }}
    />
    <motion.rect 
      x="17" y="3" width="4" height="18" rx="1"
      animate={isActive ? { height: [18, 14, 18], y: [3, 7, 3] } : {}}
      transition={{ duration: 0.8, delay: 0.4, repeat: isActive ? Infinity : 0, repeatDelay: 1 }}
    />
  </motion.svg>
);

const AnimatedLimitsIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <motion.path
      d="M12 6v6l4 2"
      animate={isActive ? { rotate: [0, 360] } : {}}
      transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: "linear" }}
      style={{ originX: "12px", originY: "12px" }}
    />
    <motion.circle
      cx="12"
      cy="12"
      r="3"
      fill="currentColor"
      animate={isActive ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
    />
  </motion.svg>
);

const AnimatedGoalsIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <motion.circle 
      cx="12" cy="12" r="6" 
      animate={isActive ? { r: [6, 7, 6] } : {}}
      transition={{ duration: 0.8, repeat: isActive ? Infinity : 0, repeatDelay: 0.5 }}
    />
    <motion.circle 
      cx="12" cy="12" r="2" 
      fill="currentColor"
      animate={isActive ? { scale: [1, 1.5, 1] } : {}}
      transition={{ duration: 0.6, repeat: isActive ? Infinity : 0, repeatDelay: 0.8 }}
    />
  </motion.svg>
);

const AnimatedSettingsIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    animate={isActive ? { rotate: [0, 90] } : {}}
    transition={{ duration: 0.5, repeat: isActive ? Infinity : 0, repeatType: "reverse", repeatDelay: 1.5 }}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </motion.svg>
);

const AnimatedAccountsIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <motion.rect 
      x="2" y="4" width="20" height="16" rx="2"
      animate={isActive ? { y: [4, 3, 4] } : {}}
      transition={{ duration: 0.6, repeat: isActive ? Infinity : 0 }}
    />
    <motion.path 
      d="M2 10h20"
      animate={isActive ? { opacity: [1, 0.5, 1] } : {}}
      transition={{ duration: 0.8, repeat: isActive ? Infinity : 0 }}
    />
  </motion.svg>
);

const AnimatedReportsIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <motion.polyline 
      points="14 2 14 8 20 8"
      animate={isActive ? { opacity: [1, 0.5, 1] } : {}}
      transition={{ duration: 0.6, repeat: isActive ? Infinity : 0 }}
    />
    <motion.line 
      x1="16" y1="13" x2="8" y2="13"
      animate={isActive ? { x1: [16, 12, 16] } : {}}
      transition={{ duration: 0.8, repeat: isActive ? Infinity : 0 }}
    />
    <line x1="16" y1="17" x2="8" y2="17" />
  </motion.svg>
);

// Animated More Icon
const AnimatedMoreIcon = ({ isActive }: { isActive: boolean }) => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <motion.rect 
      x="3" y="3" width="7" height="7" rx="1"
      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.6, repeat: isActive ? Infinity : 0, repeatDelay: 0.5 }}
    />
    <motion.rect 
      x="14" y="3" width="7" height="7" rx="1"
      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.6, delay: 0.1, repeat: isActive ? Infinity : 0, repeatDelay: 0.5 }}
    />
    <motion.rect 
      x="3" y="14" width="7" height="7" rx="1"
      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.6, delay: 0.2, repeat: isActive ? Infinity : 0, repeatDelay: 0.5 }}
    />
    <motion.rect 
      x="14" y="14" width="7" height="7" rx="1"
      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.6, delay: 0.3, repeat: isActive ? Infinity : 0, repeatDelay: 0.5 }}
    />
  </motion.svg>
);

const NAV_ITEMS: NavItem[] = [
  { 
    screen: "home", 
    label: (t) => t.home, 
    icon: <AnimatedHomeIcon isActive={false} />,
    gradient: "from-blue-500 to-indigo-600"
  },
  { 
    screen: "transactions", 
    label: (t) => t.transactions, 
    icon: <AnimatedTransactionsIcon isActive={false} />,
    gradient: "from-purple-500 to-pink-500"
  },
  { 
    screen: "goals", 
    label: (t) => t.goals || "Goals", 
    icon: <AnimatedGoalsIcon isActive={false} />,
    gradient: "from-emerald-500 to-teal-500"
  },
  { 
    screen: "more", 
    label: (t) => t.more || "More", 
    icon: <AnimatedMoreIcon isActive={false} />,
    gradient: "from-slate-500 to-zinc-600"
  },
];

interface BottomNavProps {
  onAddClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onAddClick }) => {
  const { t, activeScreen, setActiveScreen } = useApp();

  // Split items for layout around center button
  const leftItems = NAV_ITEMS.slice(0, 3);
  const rightItems = NAV_ITEMS.slice(3);

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner px-1 py-2">
        <div className="flex items-center justify-between">
          {/* Left side items */}
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
          <motion.button
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.05 }}
            onClick={onAddClick}
            className="w-14 h-14 -mt-8 rounded-2xl bg-gradient-to-br from-primary via-primary to-blue-600 text-primary-foreground flex items-center justify-center shadow-lg relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-white/20"
              animate={{ 
                scale: [1, 2],
                opacity: [0.3, 0],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ borderRadius: "50%" }}
            />
            <motion.span 
              className="text-2xl font-light relative z-10"
              animate={{ rotate: [0, 90, 0] }}
              transition={{ duration: 0.3 }}
              whileHover={{ rotate: 90 }}
            >
              +
            </motion.span>
          </motion.button>

          {/* Right side items */}
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
  const IconComponent = () => {
    switch (item.screen) {
      case "home":
        return <AnimatedHomeIcon isActive={isActive} />;
      case "transactions":
        return <AnimatedTransactionsIcon isActive={isActive} />;
      case "goals":
        return <AnimatedGoalsIcon isActive={isActive} />;
      case "more":
        return <AnimatedMoreIcon isActive={isActive} />;
      default:
        return null;
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-2 py-1.5 relative min-w-[52px]"
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className={`absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r ${item.gradient}`}
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      
      <motion.div
        className={`transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <IconComponent />
      </motion.div>
      
      <motion.span
        className={`text-[10px] font-medium transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`}
        animate={{ opacity: isActive ? 1 : 0.7 }}
      >
        {item.label(t)}
      </motion.span>
    </motion.button>
  );
};
