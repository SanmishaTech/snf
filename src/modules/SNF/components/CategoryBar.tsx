import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { MultiSelect } from "@/components/ui/MultiSelect";

export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
}

interface CategoryBarProps {
  categories: Category[];
  selectedCats: number[];
  onSelectCategory: (id: number) => void;
  onSelectAll: () => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  selectedTags: string[];
  allTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const CategoryBarComponent: React.FC<CategoryBarProps> = ({
  categories,
  selectedCats,
  onSelectCategory,
  onSelectAll,
  isLoading,
  error,
  onRetry,
  selectedTags,
  allTags,
  onTagsChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    window.requestAnimationFrame(() => {
      const isLeftVisible = el.scrollLeft > 2;
      const isRightVisible = el.scrollLeft + el.clientWidth < el.scrollWidth - 5;
      
      setCanScrollLeft(prev => prev !== isLeftVisible ? isLeftVisible : prev);
      setCanScrollRight(prev => prev !== isRightVisible ? isRightVisible : prev);
    });
  }, []);

  useEffect(() => {
    if (!isLoading && categories.length > 0) {
      const timer = setTimeout(checkScroll, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, categories.length, checkScroll]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftStart(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeftStart - walk;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -200 : 200;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="border-b border-border">
        <div className="flex overflow-x-auto gap-1 px-1 scrollbar-hide items-end">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shrink-0 px-5 py-3 animate-pulse">
              <div className="h-4 w-20 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">Browse by Category</h2>
        {error && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>

      <div className="relative group">
        <AnimatePresence>
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 flex items-center z-20 pointer-events-none pr-10">
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background via-background/90 to-transparent pointer-events-none" />
              <button
                type="button"
                onClick={() => scroll('left')}
                className="ml-2 h-9 w-9 flex items-center justify-center rounded-full bg-background border border-border shadow-md text-foreground hover:text-primary hover:border-primary/30 hover:scale-110 transition-all duration-200 pointer-events-auto"
                aria-label="Scroll Left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 flex items-center z-20 pointer-events-none pl-10">
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background via-background/90 to-transparent pointer-events-none" />
              <button
                type="button"
                onClick={() => scroll('right')}
                className="mr-2 h-9 w-9 flex items-center justify-center rounded-full bg-background border border-border shadow-md text-foreground hover:text-primary hover:border-primary/30 hover:scale-110 transition-all duration-200 pointer-events-auto"
                aria-label="Scroll Right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 min-w-0 w-full border-b border-border">
            <motion.div
            ref={scrollRef}
            onScroll={checkScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.4,
                  staggerChildren: 0.03,
                  delayChildren: 0.1,
                },
              },
            }}
            className={`flex overflow-x-auto gap-1 px-1 scrollbar-hide items-end select-none transition-cursor ${
              canScrollLeft || canScrollRight ? 'cursor-grab active:cursor-grabbing' : ''
            } ${isDragging ? 'cursor-grabbing' : ''}`}
          >
            <motion.button
              key="all"
              id="category-all"
              type="button"
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSelectAll}
              className={`shrink-0 transition-all duration-200 px-5 py-3 text-sm font-medium whitespace-nowrap relative ${
                selectedCats.length === 0
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              All Types
              {selectedCats.length === 0 && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>

            {categories.map((cat) => {
              const catIdNum = parseInt(cat.id, 10);
              const isSelected = selectedCats.includes(catIdNum);
              return (
                <motion.button
                  key={cat.id}
                  id={`category-${catIdNum}`}
                  type="button"
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCategory(catIdNum);
                  }}
                  className={`shrink-0 transition-all duration-200 px-5 py-3 text-sm font-medium whitespace-nowrap relative ${
                    isSelected
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {cat.name}
                  {isSelected && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}

            {categories.length === 0 && !error && (
              <p className="py-4 px-6 text-sm text-muted-foreground">No categories available.</p>
            )}
          </motion.div>
        </div>

        <div className="shrink-0 w-full md:w-64 pb-0.5">
          <MultiSelect
            options={(allTags.length > 0 ? allTags : ['A2', 'Organic', 'Natural', 'Fresh', 'Pure', 'Premium', 'Healthy']).map(t => ({
              label: t.charAt(0).toUpperCase() + t.slice(1),
              value: t.toLowerCase()
            }))}
            defaultValue={selectedTags}
            onValueChange={onTagsChange}
            placeholder="Filter by Tags"
            variant="inverted"
            hideTagsInTrigger={true}
            className="border-none shadow-none hover:bg-muted/30 h-11"
          />
        </div>
      </div>
      </div>
    </div>
  );
};

export const CategoryBar = React.memo(CategoryBarComponent);
