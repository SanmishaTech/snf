import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBasket } from "lucide-react";
import { gsap } from "gsap";
import { productService } from "@/modules/SNF/services/api";

export interface AnimatedCategoryNavItem {
  id: number | null; // null for All
  name: string;
  imageUrl?: string;
}

interface AnimatedCategoryNavProps {
  categories?: AnimatedCategoryNavItem[];
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
  className?: string;
}

/**
 * Animated horizontal category nav with a fluid slider under the active item.
 * - Renders an "All" item followed by categories
 * - Smooth slider movement with bounce
 * - Scroll buttons for overflow
 */
const AnimatedCategoryNav: React.FC<AnimatedCategoryNavProps> = ({
  categories: categoriesProp,
  selectedId = null,
  onSelect,
  className = "",
}) => {
  const [cats, setCats] = useState<AnimatedCategoryNavItem[]>([]);
  const [active, setActive] = useState<number | null>(selectedId ?? null);
  const [indicatorX, setIndicatorX] = useState(0);
  const [indicatorW, setIndicatorW] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const sliderRef = useRef<HTMLDivElement | null>(null); // translates and sizes
  const capRef = useRef<SVGSVGElement | null>(null);     // curved cap SVG
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const prevXRef = useRef(0);
  const prevWRef = useRef(0);
  const animationRef = useRef<gsap.core.Tween | null>(null);

  // Visual constants
  const capHeight = 49  ; // height of SVG area
  const bumpPad = 10;   // reduced padding for tighter fit
  const labelBottomInsideCap = 5; // spacing from cap top line to label baseline

  // Indicator dimensions (baseline removed)

  // Track previous indicator position/width for potential future use; no flare/bounce.
  useEffect(() => { 
    if (!isReady) {
      prevXRef.current = indicatorX;
      prevWRef.current = indicatorW;
      return;
    }
    prevXRef.current = indicatorX;
    prevWRef.current = indicatorW;
  }, [indicatorX, indicatorW, isReady]);

  // Merge provided categories with API fetch (if not provided)
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (categoriesProp && categoriesProp.length > 0) {
        const withAll: AnimatedCategoryNavItem[] = [
          { id: null, name: "All" },
          ...categoriesProp,
        ];
        if (isMounted) setCats(withAll);
        return;
      }
      try {
        const data = await productService.getCategories();
        const normalized: AnimatedCategoryNavItem[] = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: Number(c.id ?? c._id ?? c.slug ?? 0) || 0,
          name: c.name || c.title || "Category",
          imageUrl: c.imageUrl || c.attachmentUrl || c.iconUrl || c.url || undefined,
        }));
        const withAll: AnimatedCategoryNavItem[] = [{ id: null, name: "All" }, ...normalized];
        if (isMounted) setCats(withAll);
      } catch (e) {
        const withAll: AnimatedCategoryNavItem[] = [{ id: null, name: "All" }];
        if (isMounted) setCats(withAll);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [categoriesProp]);

  // Keep internal active in sync
  useEffect(() => {
    setActive(selectedId ?? null);
  }, [selectedId]);

  // Helper to move indicator under the active item
  const moveSlider = (ensureInView: boolean = true) => {
    const key = String(active ?? "all");
    const el = itemRefs.current[key];
    const slider = sliderRef.current;
    const container = containerRef.current;
    if (!el || !slider || !container) return;

    const elRect = el.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    // Prefer sizing to the label width with padding, centered within the button
    const labelEl = labelRefs.current[key];
    
    // Tighter padding for more adaptive sizing
    const padX = 8; 
    let left: number;
    let width: number;
    if (labelEl) {
      const labelRect = labelEl.getBoundingClientRect();
      const labelLeft = labelRect.left - contRect.left + container.scrollLeft;
      
      // Calculate desired position and width
      const desiredLeft = labelLeft - padX;
      const desiredWidth = Math.max(45, labelRect.width + padX * 2);
      
      // If position would be negative, clamp to 0 and adjust width accordingly
      if (desiredLeft < 0) {
        left = 0;
        width = Math.max(45, desiredWidth + desiredLeft); // Reduce width by the clamped amount
      } else {
        left = desiredLeft;
        width = desiredWidth;
      }
    } else {
      // Fallback to button width
      left = elRect.left - contRect.left + container.scrollLeft + 8;
      width = Math.max(45, elRect.width - 16);
    }

    setIndicatorX(left);
    setIndicatorW(width);

    // Ensure item is in view only when requested
    if (ensureInView) {
      const scrollLeft = container.scrollLeft;
      const viewLeft = scrollLeft;
      const viewRight = scrollLeft + container.clientWidth;
      const buttonLeft = elRect.left - contRect.left + container.scrollLeft;
      const buttonRight = buttonLeft + elRect.width;
      
      if (buttonLeft < viewLeft + 20) {
        container.scrollTo({ left: Math.max(0, buttonLeft - 20), behavior: "smooth" });
      } else if (buttonRight > viewRight - 20) {
        container.scrollTo({ left: buttonRight - container.clientWidth + 20, behavior: "smooth" });
      }
    }
  };

  // Move slider on mount, active change, resize with layout sync and rAF
  useLayoutEffect(() => {
    let raf: number | null = requestAnimationFrame(() => moveSlider());
    const onResize = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        moveSlider();
        rafIdRef.current = null;
      });
    };
    window.addEventListener("resize", onResize);
    // Mark as ready after first layout pass so transitions apply only after initial placement
    const t = setTimeout(() => setIsReady(true), 30);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
      // Clean up any running animations
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
    };
  }, [cats.length, active]);

  // GSAP animation for smooth movement with subtle bounce
  useEffect(() => {
    if (!isReady || !sliderRef.current) return;
    
    // Kill any existing animation to prevent conflicts
    if (animationRef.current) {
      animationRef.current.kill();
    }
    
    const targetX = Math.max(0, indicatorX - bumpPad);
    const targetWidth = Math.max(indicatorW + bumpPad * 2, 60);
    
    // Clean, smooth animation
    animationRef.current = gsap.to(sliderRef.current, {
      x: targetX,
      width: targetWidth,
      duration: 0.3,
      ease: "power2.out",
      overwrite: false, // We handle this manually
      onComplete: () => {
        // Very subtle pulse effect at the end
        gsap.to(sliderRef.current, {
          scaleX: 1.005,
          duration: 0.06,
          ease: "power1.out",
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            animationRef.current = null; // Clear ref when done
          }
        });
      }
    });
  }, [indicatorX, indicatorW, isReady, bumpPad]);

  // Keep indicator aligned while the container scrolls smoothly
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      // During scroll, only update position without triggering auto-scroll
      if (rafIdRef.current !== null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        moveSlider(false); // Don't trigger auto-scroll during manual scroll
        rafIdRef.current = null;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll as any);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [active, cats.length]);

  const handleSelect = (id: number | null) => {
    // Kill any running animation immediately for responsive feel
    if (animationRef.current) {
      animationRef.current.kill();
      animationRef.current = null;
    }
    setActive(id);
    onSelect?.(id);
  };

  const scrollBy = (delta: number) => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  const hasOverflow = useMemo(() => {
    const cont = containerRef.current;
    const track = trackRef.current;
    if (!cont || !track) return false;
    return track.scrollWidth > cont.clientWidth + 4;
  }, [cats.length]);

  // We show text in the static button label, not inside the moving cap.

  return (
    <div className={`relative z-30 w-full ${className}`}>
      {/* Background that visually blends into banner */}
      <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-background text-foreground">
        {/* Curved bottom edge to blend into hero */}
        <div className="container mx-auto px-3 md:px-6 lg:px-8 border-0">
          <div className="relative py-3">
            <div className="relative">
              {/* Scroll buttons */}
              {hasOverflow && (
                <button
                  type="button"
                  aria-label="Scroll left"
                  onClick={() => scrollBy(-240)}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 hidden md:grid place-items-center h-8 w-8 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground shadow"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}

              <div
                ref={containerRef}
                className="relative overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain"
              >
          {/* Track */}
          <div ref={trackRef} className="relative inline-flex items-stretch gap-2 pr-5">
            {/* Subtle baseline with same thickness as cap stroke for seamless origin illusion */}
            <div className="absolute left-0 right-0 bottom-0 h-[1.5px] bg-current/35 pointer-events-none" />
            {/* Curved cap with right-fading stroke */}
            <div
              ref={sliderRef}
              className="absolute bottom-0 z-20 pointer-events-none"
              style={{ 
                width: Math.max(indicatorW + bumpPad * 2, 60), // ensure minimum width for stability
                transform: `translate3d(${Math.max(0, indicatorX - bumpPad)}px,0,0)` 
              }}
            >
              {/* Eraser strip to remove baseline under the cap so thickness stays consistent */}
              <div className="absolute left-0 right-0 bottom-0 h-[1.5px] bg-background" />
              <svg
  ref={capRef}
  className="block"
  width="100%"
  height={capHeight}
  viewBox="0 0 100 30"
  preserveAspectRatio="none"
>
  <defs>
    <linearGradient id="capStroke" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
      <stop offset="85%" stopColor="currentColor" stopOpacity="1" />
      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
    </linearGradient>
  </defs>

  {/* Cap shape: symmetrical curves for stability with longer text */}
  <path
    d="M0 30 
       C 4 30, 8 28, 11 25 
       C 15 21, 18 17, 22 17 
       H 78 
       C 82 17, 85 21, 89 25 
       C 92 28, 96 30, 100 30"
    fill="none"
    stroke="url(#capStroke)"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
  />

  {/* Centered text "AI" */}
  {/* <text
    x="50"
    y="20"
    fontSize="14"
    fontWeight="bold"
    fill="currentColor"
    textAnchor="middle"
    dominantBaseline="central"
  >
    AI
  </text> */}
</svg>
            </div>
            {cats.map((c) => {
              const key = String(c.id ?? "all");
              const isActive = (active ?? null) === (c.id ?? null);
              return (
                <button
                  key={key}
                  ref={(el) => {
                    itemRefs.current[key] = el;
                  }}
                  onClick={() => handleSelect(c.id ?? null)}
                  className={`relative flex flex-col items-center justify-start min-w-[76px] h-[72px] px-3 pt-1 pb-[22px] bg-transparent select-none transition-[opacity] duration-300 ease-out text-foreground ${
                    isActive ? "opacity-100" : "opacity-90 hover:opacity-100"
                  }`}
                  aria-pressed={isActive}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {/* Icon stays put; only slider moves horizontally */}
                  <div className="mb-3 relative z-30">
                    {c.id === null ? (
                      <ShoppingBasket className="h-8 w-8  " strokeWidth={1.75} />
                    ) : c.imageUrl ? (
                      <img
                        src={`${import.meta.env.VITE_BACKEND_URL || ""}${c.imageUrl}`}
                        alt={c.name}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-border/40"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full p-4 bg-accent grid place-items-center text-[10px] text-accent-foreground">
                        {c.name?.charAt(0) || "C"}
                      </div>
                    )}
                  </div>
                  <span
                    ref={(el) => { labelRefs.current[key] = el; }}
                    className={`absolute inset-x-0 z-10 text-center leading-none font-semibold tracking-wide text-[11px] sm:text-[12px] pointer-events-none`}
                    style={{ bottom: labelBottomInsideCap }}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}
                </div>
              </div>

              {hasOverflow && (
                <button
                  type="button"
                  aria-label="Scroll right"
                  onClick={() => scrollBy(240)}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:grid place-items-center h-8 w-8 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground shadow"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AnimatedCategoryNav;
