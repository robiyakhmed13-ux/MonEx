import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { SmartNotification } from "@/types";
import { X, Bell, AlertTriangle, Info, AlertCircle, Check } from "lucide-react";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SmartNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
}) => {
  const { t, lang, setActiveScreen } = useApp();

  const getSeverityIcon = (severity: SmartNotification["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getSeverityBg = (severity: SmartNotification["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 border-destructive/20";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20";
      default:
        return "bg-primary/10 border-primary/20";
    }
  };

  const handleNotificationClick = (notif: SmartNotification) => {
    onMarkAsRead(notif.id);
    if (notif.actionType) {
      switch (notif.actionType) {
        case "view_limit":
          setActiveScreen("limits");
          break;
        case "view_goal":
          setActiveScreen("goals");
          break;
        case "view_transaction":
          setActiveScreen("transactions");
          break;
        case "view_debt":
          setActiveScreen("debt-assessment");
          break;
      }
      onClose();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return lang === "ru" ? "Сейчас" : lang === "uz" ? "Hozir" : "Now";
    if (minutes < 60) return `${minutes}${lang === "ru" ? " мин" : lang === "uz" ? " daq" : "m"}`;
    if (hours < 24) return `${hours}${lang === "ru" ? " ч" : lang === "uz" ? " s" : "h"}`;
    return `${days}${lang === "ru" ? " д" : lang === "uz" ? " k" : "d"}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  {lang === "ru" ? "Уведомления" : lang === "uz" ? "Bildirishnomalar" : "Notifications"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {lang === "ru" ? "Очистить" : lang === "uz" ? "Tozalash" : "Clear All"}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto h-[calc(100%-64px)] touch-pan-y">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Bell className="w-12 h-12 mb-4 opacity-30" />
                  <p>{lang === "ru" ? "Нет уведомлений" : lang === "uz" ? "Bildirishnomalar yo'q" : "No notifications"}</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {notifications.map((notif, index) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                        getSeverityBg(notif.severity)
                      } ${notif.read ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(notif.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-medium text-foreground truncate">
                              {notif.title}
                            </h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notif.message}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
