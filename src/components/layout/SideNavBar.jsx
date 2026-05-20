import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Repeat, PiggyBank, TrendingUp, Banknote, User, LogOut, Calculator, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export function SideNavBar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Swap', path: '/swap', icon: Repeat },
    { name: 'Vault & Saves', path: '/vault', icon: PiggyBank },
    { name: 'Stocks', path: '/stocks', icon: TrendingUp },
    { name: 'Add / Withdraw', path: '/fiat', icon: Banknote },
    { name: 'Tax Center', path: '/tax', icon: Calculator },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const sidebarContent = (
    <div className={cn(
      "flex flex-col h-full bg-surface-dark text-white overflow-hidden transition-all duration-300 relative",
      isCollapsed ? "w-[80px]" : "w-[260px]"
    )}>
      {/* Collapse Toggle Button (Desktop Only) */}
      <button 
        onClick={onToggleCollapse}
        className="hidden md:flex absolute -right-3 top-10 w-6 h-6 bg-brand-gold rounded-full items-center justify-center text-surface-dark shadow-lg z-50 hover:scale-110 transition-transform"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={cn("p-8 flex items-center justify-between", isCollapsed && "px-4 justify-center")}>
        {!isCollapsed ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col"
          >
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-[24px]">Blin</span>
              <span className="font-body text-[24px] text-brand-accent">Finance</span>
            </div>
            <div className="text-[11px] text-text-muted mt-1">Your Financial Hub</div>
          </motion.div>
        ) : (
          <div className="flex items-center justify-center bg-white/10 w-10 h-10 rounded-xl font-display font-bold text-brand-gold">B</div>
        )}
        <button 
          onClick={onClose}
          className="md:hidden p-2 text-white/50 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className={cn("flex-1 px-4 py-2 space-y-2 overflow-y-auto overflow-x-hidden", isCollapsed && "px-2")}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => {
              if (window.innerWidth < 768) onClose();
            }}
            title={isCollapsed ? item.name : ""}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 h-12 rounded-lg transition-all relative group",
              isCollapsed && "justify-center px-0",
              isActive 
                ? "bg-white/10 text-white border-l-[3px] border-brand-gold" 
                : "text-white/50 hover:text-white/80 hover:bg-white/5 border-l-[3px] border-transparent"
            )}
          >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-body font-medium text-[14px] truncate"
              >
                {item.name}
              </motion.span>
            )}
            
            {/* Tooltip for collapsed mode */}
            {isCollapsed && (
              <div className="absolute left-16 bg-surface-dark text-white text-[12px] px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] border border-white/10">
                {item.name}
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 border-y-[4px] border-y-transparent border-r-[4px] border-surface-dark" />
              </div>
            )}
          </NavLink>
        ))}
      </div>

      <div className={cn("p-6 border-t border-white/10", isCollapsed && "p-4")}>
        <div className={cn("flex items-center gap-3 mb-4", isCollapsed && "justify-center")}>
          <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center font-bold shrink-0">
            AO
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col overflow-hidden"
            >
              <span className="text-[14px] font-bold truncate">Amara Okonkwo</span>
              <span className="text-[12px] text-white/50 truncate">amara.o@gmail.com</span>
            </motion.div>
          )}
        </div>
        <button 
          title={isCollapsed ? "Sign Out" : ""}
          className={cn(
            "flex items-center gap-2 text-[13px] text-brand-red hover:text-[#ff6b6b] transition-colors w-full",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300",
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}>
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
