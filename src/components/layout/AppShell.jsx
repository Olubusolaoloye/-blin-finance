import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNavBar } from './BottomNavBar';
import { SideNavBar } from './SideNavBar';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationToastContainer } from '../NotificationContext';
import { NotificationHub } from '../NotificationHub';
import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AppShell() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isAuthRoute = ['/', '/login', '/onboarding'].includes(location.pathname);

  if (isAuthRoute) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen bg-surface-bg"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bg flex">
      <NotificationToastContainer />
      <SideNavBar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main className={cn(
        "flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0 transition-all duration-300",
        isSidebarCollapsed ? "md:ml-[80px]" : "md:ml-[260px]"
      )}>
        <header className="hidden md:flex items-center justify-end px-8 py-4 gap-4 sticky top-0 bg-surface-bg/80 backdrop-blur-md z-30">
          <NotificationHub />
        </header>

        {/* Mobile Header with Menu and Bell */}
        <div className="md:hidden flex items-center justify-between p-4 sticky top-0 bg-surface-bg/80 backdrop-blur-md z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-text-secondary hover:bg-surface-raised rounded-full transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="font-display font-bold text-brand-navy">Blin Finance</div>
          <NotificationHub />
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 lg:px-10 pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <BottomNavBar />
    </div>
  );
}
