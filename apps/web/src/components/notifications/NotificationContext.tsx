"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "alert";
  read: boolean;
  timestamp: Date;
  showToast?: boolean;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Partial<Notification>) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  const addNotification = useCallback((notification: Partial<Notification>) => {
    const id = Date.now();
    const newNotif: Notification = {
      id,
      timestamp: new Date(),
      read:      false,
      type:      "info",
      title:     "",
      message:   "",
      ...notification,
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);
  }, []);

  const markAsRead    = useCallback((id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);
  const clearAll      = useCallback(() => { setNotifications([]); setUnreadCount(0); }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function NotificationToastContainer() {
  const { notifications, markAsRead } = useNotifications();
  const recent = notifications.filter((n) => !n.read).slice(0, 3);

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {recent.map((n) => (
          <Toast key={n.id} notification={n} onDismiss={() => markAsRead(n.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="pointer-events-auto bg-white rounded-2xl shadow-xl border border-border-light p-4 w-[320px] flex gap-3 items-start group"
    >
      <div
        className={cn(
          "p-2 rounded-full",
          notification.type === "success" ? "bg-brand-green/10 text-brand-green" :
          notification.type === "error"   ? "bg-brand-red/10 text-brand-red"     :
          notification.type === "alert"   ? "bg-brand-gold/10 text-brand-gold"   :
                                            "bg-brand-blue/10 text-brand-blue",
        )}
      >
        {notification.type === "success" ? <CheckCircle2 size={20} /> :
         notification.type === "error"   ? <AlertCircle  size={20} /> :
         notification.type === "alert"   ? <ShieldCheck  size={20} /> :
                                           <Info         size={20} />}
      </div>
      <div className="flex-1">
        <div className="font-bold text-[14px] text-text-primary leading-tight mb-1">
          {notification.title}
        </div>
        <div className="text-[12px] text-text-secondary leading-normal">
          {notification.message}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="text-text-muted hover:text-text-primary p-1 rounded-full hover:bg-surface-raised transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
