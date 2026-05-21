"use client";

/**
 * BottomSheet — responsive sheet/modal component.
 *
 * Mobile  (<768 px): slides up from the bottom edge.
 * Desktop (≥768 px): opens as a centered floating modal with a
 *                    frosted-glass backdrop and a scale+fade entrance.
 *
 * All existing usage passes through unchanged — no page edits required.
 */

import { useEffect, useState } from "react";
import { createPortal }        from "react-dom";
import { X }                   from "lucide-react";
import { cn }                  from "@/lib/utils";

interface BottomSheetProps {
  isOpen:       boolean;
  onClose:      () => void;
  children:     React.ReactNode;
  /** Applied only on mobile (bottom-sheet height / padding). Ignored on desktop. */
  className?:   string;
  steps?:       number;
  currentStep?: number;
  /** Desktop modal max-width override, e.g. "max-w-[640px]". Default: max-w-[560px]. */
  desktopWidth?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  className   = "",
  steps       = 0,
  currentStep = 0,
  desktopWidth,
}: BottomSheetProps) {
  const [mounted,   setMounted]   = useState(false);
  const [visible,   setVisible]   = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  /* ── Lifecycle ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    setMounted(true);
    const mq      = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!mounted) return null;

  const show = visible && isOpen;

  /* ── Styles ─────────────────────────────────────────────────────────────── */

  // Backdrop
  const backdropStyle: React.CSSProperties = {
    position:       "fixed",
    inset:          0,
    background:     isDesktop ? "rgba(13,33,55,0.38)" : "rgba(13,33,55,0.55)",
    backdropFilter: isDesktop ? "blur(5px)"           : "none",
    zIndex:         9998,
    opacity:        show ? 1 : 0,
    transition:     "opacity 0.22s ease",
    pointerEvents:  isOpen ? "auto" : "none",
  };

  // Desktop: centered modal
  const desktopPanelStyle: React.CSSProperties = {
    position:      "fixed",
    top:           "50%",
    left:          "50%",
    transform:     show
      ? "translate(-50%, -50%) scale(1)"
      : "translate(-50%, -52%) scale(0.96)",
    opacity:       show ? 1 : 0,
    transition:    "transform 0.22s cubic-bezier(0.34,1.2,0.64,1), opacity 0.18s ease",
    background:    "#ffffff",
    borderRadius:  16,
    zIndex:        9999,
    width:         "min(560px, calc(100vw - 48px))",
    maxHeight:     "min(720px, 88dvh)",
    display:       "flex",
    flexDirection: "column",
    boxShadow:     "0 24px 64px rgba(13,33,55,0.2), 0 4px 16px rgba(0,0,0,0.08)",
    pointerEvents: isOpen ? "auto" : "none",
    overflow:      "hidden",
  };

  // Mobile: bottom sheet
  const mobilePanelStyle: React.CSSProperties = {
    position:      "fixed",
    bottom:        0,
    left:          0,
    right:         0,
    background:    "#ffffff",
    borderRadius:  "20px 20px 0 0",
    zIndex:        9999,
    maxHeight:     "95dvh",
    display:       "flex",
    flexDirection: "column",
    boxShadow:     "0 -8px 40px rgba(0,0,0,0.15)",
    transform:     show ? "translateY(0)" : "translateY(100%)",
    transition:    "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
    pointerEvents: isOpen ? "auto" : "none",
  };

  const panelStyle = isDesktop ? desktopPanelStyle : mobilePanelStyle;

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return createPortal(
    <>
      {/* Backdrop */}
      <div style={backdropStyle} onClick={onClose} />

      {/* Panel */}
      <div
        style={panelStyle}
        className={!isDesktop ? className : undefined}
      >
        {/* Desktop: close button in top-right */}
        {isDesktop && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface-raised hover:bg-border-light flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        )}

        {/* Mobile: drag handle */}
        {!isDesktop && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 bg-border-medium rounded-full" />
          </div>
        )}

        {/* Step dots (shared) */}
        {steps > 0 && (
          <div className="flex justify-center gap-2 py-3 shrink-0">
            {Array.from({ length: steps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full border transition-all",
                  i === currentStep
                    ? "w-2 h-2 bg-brand-gold border-brand-gold scale-100"
                    : "w-1.5 h-1.5 bg-transparent border-border-medium scale-80",
                )}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 pb-6 pb-safe">
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
