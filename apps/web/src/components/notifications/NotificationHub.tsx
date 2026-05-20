"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, X, Check, Trash2, ShieldCheck } from "lucide-react";
import { useNotifications } from "./NotificationContext";
import { cn } from "@/lib/utils";
import { BlinButton } from "@/components/ui/BlinButton";

export function NotificationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white rounded-full border border-border-light shadow-sm text-text-secondary hover:text-brand-blue hover:border-brand-blue/30 transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-brand-red text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/5"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-[360px] max-h-[500px] bg-white rounded-2xl shadow-2xl border border-border-light z-50 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border-light flex items-center justify-between bg-surface-raised">
                <h3 className="font-display font-bold text-text-primary">Notifications</h3>
                <div className="flex gap-2">
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 text-text-muted hover:text-brand-blue transition-colors"
                    title="Mark all as read"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={clearAll}
                    className="p-1.5 text-text-muted hover:text-brand-red transition-colors"
                    title="Clear all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[400px] hide-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-surface-raised rounded-full flex items-center justify-center text-text-muted">
                      <Bell size={24} />
                    </div>
                    <p className="text-[14px] text-text-muted">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-light/50">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={cn(
                          "p-4 flex gap-3 hover:bg-surface-raised transition-colors cursor-pointer relative",
                          !n.read && "bg-brand-blue/[0.02]",
                        )}
                      >
                        {!n.read && (
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-blue rounded-full" />
                        )}
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            n.type === "success" ? "bg-brand-green/10 text-brand-green" :
                            n.type === "error"   ? "bg-brand-red/10 text-brand-red"     :
                            n.type === "alert"   ? "bg-brand-gold/10 text-brand-gold"   :
                                                   "bg-brand-blue/10 text-brand-blue",
                          )}
                        >
                          {n.type === "success" ? <Check size={18} /> :
                           n.type === "alert"   ? <ShieldCheck size={18} /> :
                                                  <Bell size={18} />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-bold text-[14px] text-text-primary truncate pr-2">{n.title}</span>
                            <span className="text-[10px] text-text-muted whitespace-nowrap pt-0.5">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-[13px] text-text-secondary leading-relaxed line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-surface-raised border-t border-border-light text-center">
                <button className="text-[12px] font-bold text-brand-accent hover:underline">
                  View All Notifications
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
