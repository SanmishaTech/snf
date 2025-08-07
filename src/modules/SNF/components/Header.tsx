import React, { useEffect, useRef, useState } from "react";
import { ShoppingCart, User, Search } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";

interface HeaderProps {
  cartCount: number;
  onSearch: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ cartCount }) => {
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`top-0 inset-x-0 z-40 bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur border-b transition-all ${
        sticky ? "sticky shadow-sm" : "relative"
      }`}
      aria-label="SNF store global header"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-3">
          <a href="/snf" className="flex items-center gap-2" aria-label="SNF Home">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
              S
            </div>
            <span className="text-lg font-semibold tracking-tight">SNF Market</span>
          </a>

          {/* Replace submit-based search with search-as-you-type preview dropdown */}
          <div className="flex-1 max-w-xl hidden md:flex items-center">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile search icon focuses input inside GlobalSearch if desired (future enhancement) */}
            <a
              href="/snf"
              className="md:hidden inline-flex items-center justify-center rounded-md h-9 w-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
              aria-label="Search"
            >
              <Search className="size-5" aria-hidden="true" />
            </a>

            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-md h-9 w-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
              aria-label="Account"
            >
              <User className="size-5" aria-hidden="true" />
            </a>

            <a
              href="#cart"
              className="relative inline-flex items-center justify-center rounded-md h-9 w-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
              aria-label="Cart"
            >
              <ShoppingCart className="size-5" aria-hidden={true} />
              <span
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-[10px] text-primary-foreground grid place-items-center"
                aria-live="polite"
                aria-atomic="true"
              >
                {cartCount}
              </span>
            </a>
          </div>
        </div>

        {/* Mobile search (uses same GlobalSearch component) */}
        <div className="md:hidden pb-3">
          <GlobalSearch />
        </div>
      </div>
    </header>
  );
};