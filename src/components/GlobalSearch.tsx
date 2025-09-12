import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { usePricing } from "@/modules/SNF/context/PricingContext.tsx";
import type { Product, DepotVariant } from "@/modules/SNF/types";

type SortKey = "relevance" | "price_asc" | "price_desc";

type ResultItem = {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  price: number; // best display price
  mrp?: number; // highest MRP among available variants
};

const useRecentSearches = (limit = 5) => {
  const key = "snf_recent_searches";
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const save = (q: string) => {
    if (!q.trim()) return;
    const next = [q.trim(), ...recent.filter((r) => r !== q.trim())].slice(
      0,
      limit
    );
    setRecent(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  const remove = (q: string) => {
    const next = recent.filter((r) => r !== q);
    setRecent(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  const clear = () => {
    setRecent([]);
    localStorage.removeItem(key);
  };
  return { recent, save, remove, clear };
};

const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<number>(-1);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const { recent, save, remove, clear } = useRecentSearches();
  const navigate = useNavigate();

  const { state: pricingState } = usePricing();

  // Compute categories from live products
  const categories = useMemo(() => {
    const s = new Set<string>();
    pricingState.products.forEach((p: Product) => {
      const catName = (p as any)?.category?.name;
      if (catName) s.add(catName);
    });
    return ["all", ...Array.from(s)];
  }, [pricingState.products]);

  // Debounced search (client-side on mock data)
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const results = useMemo<ResultItem[]>(() => {
    const term = debouncedQ.trim().toLowerCase();

    // Build product -> variants index once
    const byProductId = new Map<number, DepotVariant[]>();
    for (const v of pricingState.depotVariants) {
      const arr = byProductId.get(v.productId) || [];
      arr.push(v as DepotVariant);
      byProductId.set(v.productId, arr);
    }

    const items: ResultItem[] = pricingState.products.map((p: Product) => {
      const variants = byProductId.get(p.id) || [];
      const available = variants.filter(v => !v.isHidden && !v.notInStock);

      // Choose a single variant to represent price + MRP consistently (cheapest display price)
      let chosenPrice = 0;
      let chosenMrp: number | undefined = undefined;
      let minDisplay = Number.POSITIVE_INFINITY;

      for (const v of available) {
        const display = Number(v.buyOncePrice ?? v.mrp ?? 0);
        if (isFinite(display) && display > 0 && display < minDisplay) {
          minDisplay = display;
          chosenPrice = display;
          chosenMrp = typeof v.mrp === 'number' && isFinite(v.mrp) && v.mrp > 0 ? v.mrp : undefined;
        }
      }

      if (!isFinite(chosenPrice) || chosenPrice === 0) {
        chosenPrice = 0;
        chosenMrp = undefined;
      }

      const imageUrl = p.attachmentUrl ? `${import.meta.env.VITE_BACKEND_URL}${p.attachmentUrl}` : undefined;
      const category = (p as any)?.category?.name;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl,
        category,
        price: chosenPrice,
        mrp: chosenMrp,
      };
    });

    let filtered = items.filter((p) => {
      const matchesTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.description || "").toLowerCase().includes(term) ||
        (p.category || "").toLowerCase().includes(term);
      const matchesCategory =
        categoryFilter === "all" || p.category === categoryFilter;
      return matchesTerm && matchesCategory;
    });

    switch (sort) {
      case "price_asc":
        filtered = filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price_desc":
        filtered = filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "relevance":
      default: {
        filtered = filtered.sort((a, b) => {
          const ta = a.name.toLowerCase();
          const tb = b.name.toLowerCase();
          const pa = ta.startsWith(term) ? 2 : ta.includes(term) ? 1 : 0;
          const pb = tb.startsWith(term) ? 2 : tb.includes(term) ? 1 : 0;
          return pb - pa;
        });
        break;
      }
    }

    return filtered.slice(0, 10);
  }, [debouncedQ, categoryFilter, sort, pricingState.products, pricingState.depotVariants]);

  // Simulate loading state during debounce
  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 320);
    return () => clearTimeout(t);
  }, [debouncedQ]);

  // Click outside to close
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Analytics placeholders
  const logSearchQuery = (query: string, count: number) => {
    console.log("analytics.search_query", { query, count, sort, categoryFilter });
  };
  const logImpressions = (ids: (string | number)[]) => {
    console.log("analytics.impressions", { ids, query: q });
  };
  const logClick = (id: string | number, position: number) => {
    console.log("analytics.click", { id, position, query: q });
  };

  useEffect(() => {
    if (open && results.length) {
      logImpressions(results.map((r) => r.id));
    }
  }, [open, results]);

  const onFocus = () => setOpen(true);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQ(e.target.value);
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (active >= 0 && active < results.length) {
        const p = results[active];
        save(q);
        logClick(p.id, active);
        navigate(`/snf/product/${p.id}`);
        setOpen(false);
        setActive(-1);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const clearQuery = () => setQ("");

  const priceLabel = (p: ResultItem) => {
    const display = (p.price || 0).toFixed(2);
    if (p.mrp && p.mrp > p.price) {
      return (
        <span className="text-sm">
          <span className="font-medium">₹{display}</span>
          <span className="ml-2 text-xs line-through text-muted-foreground">₹{p.mrp.toFixed(2)}</span>
        </span>
      );
    }
    return <span className="text-sm font-medium">₹{display}</span>;
  };

  return (
    <div className="relative w-full max-w-xl bg-white">
      <div className="relative">
        <div className="flex items-center rounded-sm bg-white border-1 border-solid border-black px-4 py-1">
          <Search className="h-5 w-5 text-gray-500 mr-2 text-black " aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="search-suggestion-list"
            aria-activedescendant={active >= 0 ? `search-option-${active}` : undefined}
            // placeholder="..."
            className="bg-transparent border-none focus:outline-none w-60"
            value={q}
            onChange={onChange}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
          />
          {q && (
            <button
              onClick={clearQuery}
              className="ml-2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div
          ref={listRef}
          id="search-suggestion-list"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg z-[60] max-h-[460px] overflow-y-auto border"
        >
          <div className="p-2 border-b flex items-center gap-2">
            <select
              className="text-xs border rounded px-2 py-1"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort results"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              {/* Removed rating sort since live data does not provide ratings */}
            </select>

            <select
              className="text-xs border rounded px-2 py-1 ml-auto"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              aria-label="Filter by category"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="p-2">
            {!q && recent.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-between px-3 py-2">
                  <h3 className="text-xs font-semibold text-gray-500">RECENT SEARCHES</h3>
                  <button className="text-xs text-blue-600" onClick={clear}>Clear all</button>
                </div>
                {recent.map((r) => (
                  <div className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 rounded" key={r}>
                    <button
                      className="text-sm text-left truncate flex-1"
                      onClick={() => setQ(r)}
                    >
                      {r}
                    </button>
                    <button className="text-xs text-muted-foreground ml-2" onClick={() => remove(r)}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-center items-center py-6">
                <div className="text-sm text-muted-foreground">Searching…</div>
              </div>
            )}

            {!loading && q && results.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No products found for “{q}”. Try a different term or adjust filters.
              </div>
            )}

            {!loading && results.map((p, idx) => (
              <Link
                to={`/snf/product/${p.id}`}
                key={p.id}
                role="option"
                id={`search-option-${idx}`}
                aria-selected={active === idx}
                onClick={() => {
                  save(q);
                  logClick(p.id, idx);
                  setOpen(false);
                  setActive(-1);
                }}
                className={`flex gap-3 px-3 py-2 rounded-md hover:bg-gray-50 focus:bg-gray-50 outline-none ${active === idx ? "ring-2 ring-primary" : ""}`}
              >
                <div className="w-20 h-16 rounded border overflow-hidden bg-muted/20 grid place-items-center">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      width={80}
                      height={60}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No image</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  {p.category && (
                    <div className="text-xs text-muted-foreground truncate">{p.category}</div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {priceLabel(p)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;