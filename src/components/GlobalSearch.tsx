import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { products as mockProducts } from "@/modules/SNF/data/products";

type PreviewProduct = {
  id: string;
  title: string;
  description?: string;
  image: string;
  price: number;
  discountPct?: number;
  rating?: number;
  category?: string;
};

type SortKey = "relevance" | "price_asc" | "price_desc" | "rating_desc";

const PRICE = (p: PreviewProduct) =>
  p.price * (1 - (p.discountPct || 0) / 100);

const toPreview = (p: any): PreviewProduct => ({
  id: p.id,
  title: p.title,
  description: p.description,
  image: p.image,
  price: p.price,
  discountPct: p.discountPct,
  rating: p.rating,
  category: p.category,
});

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

  // Compute categories from dataset
  const categories = useMemo(() => {
    const s = new Set<string>();
    mockProducts.forEach((p) => p.category && s.add(p.category));
    return ["all", ...Array.from(s)];
  }, []);

  // Debounced search (client-side on mock data)
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const results = useMemo(() => {
    const items = mockProducts.map(toPreview);
    const term = debouncedQ.trim().toLowerCase();

    let filtered = items.filter((p) => {
      const matchesTerm =
        !term ||
        p.title.toLowerCase().includes(term) ||
        (p.description || "").toLowerCase().includes(term) ||
        (p.category || "").toLowerCase().includes(term);
      const matchesCategory =
        categoryFilter === "all" || p.category === categoryFilter;
      return matchesTerm && matchesCategory;
    });

    switch (sort) {
      case "price_asc":
        filtered = filtered.sort((a, b) => PRICE(a) - PRICE(b));
        break;
      case "price_desc":
        filtered = filtered.sort((a, b) => PRICE(b) - PRICE(a));
        break;
      case "rating_desc":
        filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "relevance":
      default:
        // simple heuristic: startsWith > includes > rating/popularity if available later
        filtered = filtered.sort((a, b) => {
          const ta = a.title.toLowerCase();
          const tb = b.title.toLowerCase();
          const pa =
            (ta.startsWith(term) ? 2 : ta.includes(term) ? 1 : 0) +
            (a.rating || 0) / 10;
          const pb =
            (tb.startsWith(term) ? 2 : tb.includes(term) ? 1 : 0) +
            (b.rating || 0) / 10;
          return pb - pa;
        });
        break;
    }
    // Limit results for preview dropdown
    return filtered.slice(0, 10);
  }, [debouncedQ, categoryFilter, sort]);

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
  const logImpressions = (ids: string[]) => {
    console.log("analytics.impressions", { ids, query: q });
  };
  const logClick = (id: string, position: number) => {
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

  const priceLabel = (p: PreviewProduct) => {
    const final = PRICE(p).toFixed(2);
    return p.discountPct
      ? (
        <span className="text-sm">
          <span className="font-medium">₹{final}</span>
          <span className="ml-2 text-xs line-through text-muted-foreground">₹{p.price.toFixed(2)}</span>
          <span className="ml-1 text-xs text-green-600">({p.discountPct}% off)</span>
        </span>
        )
      : <span className="text-sm font-medium">₹{final}</span>;
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
          <Search className="h-5 w-5 text-gray-500 mr-2" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="search-suggestion-list"
            aria-activedescendant={active >= 0 ? `search-option-${active}` : undefined}
            placeholder="Search products..."
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
          className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg z-50 max-h-[460px] overflow-y-auto border"
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
              <option value="rating_desc">Rating</option>
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
                <img
                  src={`${p.image}&w=120`}
                  alt={p.title}
                  width={80}
                  height={60}
                  className="w-20 h-16 object-cover rounded border"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  {p.category && (
                    <div className="text-xs text-muted-foreground truncate">{p.category}</div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {priceLabel(p)}
                    {typeof p.rating === "number" && (
                      <span className="text-xs inline-flex items-center gap-1 text-yellow-600">
                        <Star className="w-3 h-3 fill-yellow-500 stroke-yellow-600" />
                        {p.rating?.toFixed(1)}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-green-700">In stock</span>
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