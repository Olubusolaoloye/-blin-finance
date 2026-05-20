"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import { Menu } from "lucide-react";
import { NotificationToastContainer } from "@/components/notifications/NotificationContext";
import { SideNavBar }   from "./SideNavBar";
import { BottomNavBar } from "./BottomNavBar";
import { cn }           from "@/lib/utils";
import { useProfile }   from "@/hooks/useProfile";

// Lazy-load the notification hub — it's not needed for first paint
const NotificationHub = lazy(() =>
  import("@/components/notifications/NotificationHub").then((m) => ({
    default: m.NotificationHub,
  })),
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen,      setIsSidebarOpen]      = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Loads DB profile into the local store on wallet connect
  useProfile();

  // Stable callbacks — prevent child re-renders on every AppShell render
  const openSidebar       = useCallback(() => setIsSidebarOpen(true),  []);
  const closeSidebar      = useCallback(() => setIsSidebarOpen(false), []);
  const toggleCollapse    = useCallback(() => setIsSidebarCollapsed((c) => !c), []);

  return (
    <div className="min-h-screen bg-surface-bg flex">
      <NotificationToastContainer />

      <SideNavBar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <main
        className={cn(
          "flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0 transition-[margin] duration-300",
          isSidebarCollapsed ? "md:ml-[80px]" : "md:ml-[260px]",
        )}
      >
        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-end px-8 py-4 gap-4 sticky top-0 bg-surface-bg/80 backdrop-blur-md z-30">
          <Suspense fallback={<div className="w-8 h-8" />}>
            <NotificationHub />
          </Suspense>
        </header>

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 sticky top-0 bg-surface-bg/80 backdrop-blur-md z-30">
          <button
            onClick={openSidebar}
            className="p-2 text-text-secondary hover:bg-surface-raised rounded-full transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <div className="font-display font-bold text-brand-navy">Blin Finance</div>
          <Suspense fallback={<div className="w-8 h-8" />}>
            <NotificationHub />
          </Suspense>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 lg:px-10 pb-10">
          {children}
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
