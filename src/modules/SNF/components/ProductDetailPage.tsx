import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { products as mockProducts } from "../data/products";
import SNFButton from "./SNFButton";
import { Header } from "./Header";
import { Footer } from "./Footer";

type GalleryImage = {
  src: string;
  alt: string;
};

const buildGallery = (src: string): GalleryImage[] => {
  // For mock: create variations of the main image with different widths.
  return [
    { src: `${src}&w=1200`, alt: "High resolution image" },
    { src: `${src}&w=900`, alt: "Medium resolution image" },
    { src: `${src}&w=640`, alt: "Small resolution image" },
  ];
};

const useProductById = (id?: string) => {
  const [state, set] = useState<{
    status: "idle" | "loading" | "success" | "error";
    product?: typeof mockProducts[number];
    error?: string;
  }>({ status: "idle" });

  useEffect(() => {
    if (!id) return;
    set({ status: "loading" });
    // Simulate fetch with a small delay to show skeletons
    const t = setTimeout(() => {
      const prod = mockProducts.find((p) => p.id === id);
      if (prod) {
        set({ status: "success", product: prod });
      } else {
        set({ status: "error", error: "Product not found" });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [id]);

  return state;
};

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement | null>(null);

  const { status, product, error } = useProductById(id);
  const gallery = useMemo(() => (product ? buildGallery(product.image) : []), [product]);

  // Focus management: move focus to heading once loaded or on error
  useEffect(() => {
    if (status === "success" || status === "error") {
      topRef.current?.focus();
    }
  }, [status]);

  const breadcrumb = (
    <nav className="text-sm text-muted-foreground mb-3" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        <li>
          <Link to="/snf" className="hover:underline">Home</Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a href="/snf#products" className="hover:underline">Products</a>
        </li>
        {product?.category ? (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <a href={`/snf#${product.category}`} className="hover:underline capitalize">{product.category}</a>
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header with sticky behavior */}
      <a href="#snf-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-ring px-3 py-2 rounded">
        Skip to content
      </a>
      <header role="banner" className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <Header
          cartCount={0}
          onSearch={(q) => {
            /* noop for PDP; searching handled on landing page */
          }}
        />
      </header>

      <main id="snf-main" role="main" className="container mx-auto px-4 md:px-6 lg:px-8 py-4">
        {breadcrumb}
        <h1 ref={topRef} tabIndex={-1} className="sr-only">Product details</h1>

        {status === "loading" && <DetailSkeleton />}

        {status === "error" && (
          <div className="border rounded-md p-6 text-center">
            <p className="text-lg font-semibold mb-2">Unable to load product</p>
            <p className="text-muted-foreground mb-4">{error || "Unknown error"}</p>
            <div className="flex gap-2 justify-center">
              <SNFButton onClick={() => navigate(0)} aria-label="Retry loading product">Retry</SNFButton>
              <SNFButton variant="outline" onClick={() => navigate("/snf")} aria-label="Back to listing">Back to listing</SNFButton>
            </div>
          </div>
        )}

        {status === "success" && product && (
          <>
            <article className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gallery */}
              <section aria-label="Product image gallery">
                <Gallery gallery={gallery} title={product.title} />
              </section>

              {/* Summary */}
              <section aria-label="Product summary" className="space-y-3">
                <h2 className="text-2xl md:text-3xl font-semibold">{product.title}</h2>

                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">
                    ₹{(product.price * (1 - (product.discountPct || 0) / 100)).toFixed(2)}
                  </div>
                  {product.discountPct ? (
                    <div className="text-sm text-muted-foreground line-through">₹{product.price.toFixed(2)}</div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span aria-label={`${product.rating.toFixed(1)} out of 5 stars`} className="inline-flex items-center gap-1">
                    <Stars rating={product.rating} />
                    <span className="text-muted-foreground">({product.rating.toFixed(1)})</span>
                  </span>
                  <span className="text-green-600 font-medium">In stock</span>
                  <span className="text-muted-foreground">SKU: SNF-{product.id}</span>
                </div>

                {/* Simple variant and quantity controls for mock */}
                <VariantAndQty />

                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Category: <span className="capitalize">{product.category}</span></li>
                  <li>Quality checked and packed with care</li>
                  <li>Free delivery on qualifying orders</li>
                </ul>

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h3>Highlights</h3>
                  <ul>
                    <li>Handpicked quality</li>
                    <li>Great taste and freshness</li>
                    <li>Best value</li>
                  </ul>
                  <h3>Description</h3>
                  <p>{product.description}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <SNFButton className="flex-1" aria-label={`Add ${product.title} to cart`} fullWidth>
                    Add to Cart
                  </SNFButton>
                  <SNFButton className="flex-1 hover:bg-black" variant="secondary" aria-label="Buy now" fullWidth>
                    Buy Now
                  </SNFButton>
                </div>

            
              </section>
            </article>

            {/* Product content sections */}
            <section className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Accordion />
                <Reviews />
              </div>
              <aside className="lg:col-span-1 space-y-6">
                <TrustBadges />
                <DeliveryEstimator />
              </aside>
            </section>

            {/* Suggested products */}
            <section className="mt-12">
              <h2 className="text-xl font-semibold mb-3">Related products</h2>
              <SuggestedProducts currentId={product.id} />
            </section>
          </>
        )}
      </main>

      {/* Sticky CTA */}
      {status === "success" && product && (
        <div className="sticky bottom-0 inset-x-0 bg-background border-t shadow-sm">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{product.title}</p>
              <p className="text-sm text-muted-foreground">
                ₹{(product.price * (1 - (product.discountPct || 0) / 100)).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <SNFButton aria-label={`Add ${product.title} to cart (sticky)`}>Add to Cart</SNFButton>
              <SNFButton variant="secondary" aria-label="Buy now (sticky)">Buy Now</SNFButton>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer role="contentinfo" className="mt-10 border-t">
        <Footer />
      </footer>

      {/* SEO-like metadata injection (client-side) */}
      <SeoMeta product={status === "success" ? product : undefined} />
    </div>
  );
};



const Accordion: React.FC = () => {
  return (
    <div className="divide-y rounded-md border">
      {[
        { title: "Features & Specs", content: "Farm fresh, handpicked quality. Nutritional values and storage tips included." },
        { title: "Materials/Care", content: "Keep refrigerated. Rinse before use. Store in a cool, dry place." },
        { title: "Size Guide", content: "Regular pack: 500g, Large: 1kg, Family: 2kg." },
        { title: "Shipping & Returns", content: "Fast delivery. Returns accepted within 3 days if unopened." },
        { title: "FAQs", content: "Q: Is it organic? A: Yes, sourced from trusted farms." },
      ].map((item, idx) => (
        <details key={idx} className="group">
          <summary className="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>{item.title}</span>
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="p-4 text-sm text-muted-foreground">{item.content}</div>
        </details>
      ))}
    </div>
  );
};

const Reviews: React.FC = () => {
  // Mock review summary and list
  return (
    <section aria-label="Reviews" className="space-y-4">
      <h3 className="text-lg font-semibold">Reviews</h3>
      <div className="flex items-center gap-4">
        <Stars rating={4.2} />
        <span className="text-sm text-muted-foreground">4.2 out of 5 • 128 reviews</span>
      </div>
      <div className="text-sm text-muted-foreground">
        Review filters and pagination would appear here in a full build.
      </div>
    </section>
  );
};

const TrustBadges: React.FC = () => {
  return (
    <div className="rounded-md border p-4 space-y-2">
      <h4 className="font-medium">Why shop with SNF</h4>
      <ul className="text-sm text-muted-foreground space-y-1">
        <li>✓ Secure checkout</li>
        <li>✓ Freshness guarantee</li>
        <li>✓ Free delivery over ₹299</li>
      </ul>
    </div>
  );
};

const DeliveryEstimator: React.FC = () => {
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [eta, setEta] = useState<string | null>(null);
  return (
    <div className="rounded-md border p-4 space-y-3">
      <h4 className="font-medium">Delivery/Pickup Estimator</h4>
      <div className="flex gap-2">
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          className="flex-1 rounded border px-3 py-2 bg-background"
          placeholder="Enter ZIP"
          aria-label="Enter ZIP code"
        />
        <SNFButton
          onClick={() => {
            setLoading(true);
            setTimeout(() => {
              setEta("Tomorrow, 10am - 12pm");
              setLoading(false);
            }, 600);
          }}
          loading={loading}
          aria-label="Estimate delivery"
        >
          Check
        </SNFButton>
      </div>
      {eta && <p className="text-sm text-muted-foreground">Estimated delivery: {eta}</p>}
    </div>
  );
};

const SuggestedProducts: React.FC<{ currentId: string }> = ({ currentId }) => {
  const related = mockProducts.filter((p) => p.id !== currentId).slice(0, 8);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
      {related.map((p) => (
        <Link
          key={p.id}
          to={`/snf/product/${p.id}`}
          className="rounded-lg border overflow-hidden hover:shadow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View ${p.title}`}
        >
          <img
            src={`${p.image}&w=320`}
            alt={p.title}
            className="w-full aspect-[4/3] object-cover"
            loading="lazy"
            width={320}
            height={240}
          />
          <div className="p-2">
            <p className="text-xs font-medium truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground">
              ₹{(p.price * (1 - (p.discountPct || 0) / 100)).toFixed(2)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

const Gallery: React.FC<{ gallery: GalleryImage[]; title: string }> = ({ gallery, title }) => {
  const [active, setActive] = useState(0);
  const current = gallery[active];

  return (
    <div className="space-y-3">
      <div className="relative rounded-md overflow-hidden border">
        <img
          src={current.src}
          alt={`${title} - image ${active + 1}`}
          className="w-full h-[360px] md:h-[420px] object-cover transition-transform duration-300 hover:scale-[1.02] cursor-zoom-in"
          width={1200}
          height={420}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {gallery.map((g, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`relative h-16 rounded border overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              i === active ? "ring-2 ring-primary" : ""
            }`}
            aria-label={`Show image ${i + 1}`}
          >
            <img
              src={g.src}
              alt={`${title} thumbnail ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

const Stars: React.FC<{ rating: number }> = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const total = 5;
  return (
    <span aria-hidden="true" className="text-yellow-500">
      {Array.from({ length: total }, (_, i) =>
        i < full ? "★" : i === full && half ? "☆" : "☆"
      )}
    </span>
  );
};

/** Simple variant selector + quantity for mock UX */
const VariantAndQty: React.FC = () => {
  const [variant, setVariant] = useState<string>("default");
  const [qty, setQty] = useState<number>(1);
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Variant</label>
        <div className="mt-2 flex gap-2">
          {["default", "large", "family"].map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={`px-3 py-1.5 rounded border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                variant === v ? "bg-accent" : "bg-background"
              }`}
              aria-pressed={variant === v}
              aria-label={`Select ${v} variant`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="qty" className="text-sm font-medium">Quantity</label>
        <div className="mt-2 inline-flex items-center rounded border">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <input
            id="qty"
            type="number"
            inputMode="numeric"
            className="w-14 text-center bg-transparent outline-none"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            aria-live="polite"
          />
          <button
            onClick={() => setQty((q) => q + 1)}
            className="px-3 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
      <div className="h-[420px] bg-muted/40 rounded-md" />
      <div className="space-y-3">
        <div className="h-6 bg-muted/40 rounded w-2/3" />
        <div className="h-4 bg-muted/40 rounded w-1/3" />
        <div className="h-4 bg-muted/40 rounded w-1/2" />
        <div className="h-24 bg-muted/40 rounded" />
        <div className="h-10 bg-muted/40 rounded w-1/2" />
      </div>
    </div>
  );
};

// Minimal client-side SEO tags injection for mock scenario
const SeoMeta: React.FC<{ product?: typeof mockProducts[number] }> = ({ product }) => {
  useEffect(() => {
    // Title and basic meta
    const prevTitle = document.title;
    if (product) document.title = `${product.title} | SNF`;
    // canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.href;

    // Open Graph (basic)
    const setMeta = (p: string, c: string) => {
      let m = document.querySelector(`meta[property="${p}"]`) as HTMLMetaElement | null;
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("property", p);
        document.head.appendChild(m);
      }
      m.content = c;
    };
    if (product) {
      setMeta("og:title", product.title);
      setMeta("og:type", "product");
      setMeta("og:url", window.location.href);
      setMeta("og:image", `${product.image}&w=1200`);
      setMeta("og:description", product.description);
    }

    // JSON-LD Product schema
    let script = document.getElementById("snf-product-jsonld") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "snf-product-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    if (product) {
      const data = {
        "@context": "https://schema.org/",
        "@type": "Product",
        name: product.title,
        image: [`${product.image}&w=1200`],
        description: product.description,
        sku: `SNF-${product.id}`,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: product.rating.toFixed(1),
          reviewCount: Math.max(1, Math.round(product.popularity / 10)),
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          price: (product.price * (1 - (product.discountPct || 0) / 100)).toFixed(2),
          availability: "https://schema.org/InStock",
          url: window.location.href,
        },
      };
      script.text = JSON.stringify(data);
    }

    return () => {
      document.title = prevTitle;
    };
  }, [product]);

  return null;
};

export default ProductDetailPage;