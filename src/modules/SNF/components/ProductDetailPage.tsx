import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { usePricing } from "../context/PricingContext";
import SNFButton from "./SNFButton";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCart } from "../context/CartContext";

type GalleryImage = {
  src: string;
  alt: string;
  label?: string; // optional tag/label for UI chips (not used for product tags)
};

const buildGallery = (src: string): GalleryImage[] => {
  // Create variations of the main image with different widths and labels for tags.
  const baseUrl = `${import.meta.env.VITE_BACKEND_URL}${src}`;
  const withW = (w: number) => `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}w=${w}`;
  return [
    { src: withW(1200), alt: "Product image" },
    { src: withW(800), alt: "Product image alt" },
    { src: withW(600), alt: "Product close-up" },
  ];
};

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement | null>(null);
  
  // Get depot from pricing context
  const { state: pricingState } = usePricing();
  const depotId = pricingState.currentDepot?.id;
  
  // Fetch product with variants using the hook
  const { product: productData, error: fetchError, isLoading } = useProduct(
    id ? parseInt(id) : undefined,
    depotId || 1 // Fallback to depot ID 1 if no depot is set
  );
  
  // State for selected variant
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    searchParams.get('variant') ? parseInt(searchParams.get('variant')!) : null
  );
  const [quantity, setQuantity] = useState(1);
  const addBtnWrapRef = useRef<HTMLDivElement | null>(null);
  const stickyAddBtnWrapRef = useRef<HTMLDivElement | null>(null);
  const { addItem } = useCart();
  
  // Get selected variant
  const selectedVariant = useMemo(() => {
    if (!productData) return null;
    if (selectedVariantId) {
      return productData.variants.find(v => v.id === selectedVariantId);
    }
    // Default to first available variant
    return productData.variants.find(v => !v.notInStock && !v.isHidden) || productData.variants[0];
  }, [selectedVariantId, productData]);
  
  // Calculate display price using mrp and buyOncePrice
  const displayPrice = selectedVariant ? (selectedVariant.buyOncePrice || selectedVariant.mrp || 0) : 0;
  const mrpPrice = selectedVariant?.mrp || 0;
  const discount = mrpPrice > displayPrice ? ((mrpPrice - displayPrice) / mrpPrice) : 0;
  
  const gallery = useMemo(() => (
    productData ? buildGallery(productData.product.attachmentUrl || '') : []
  ), [productData]);

  // Derive product attribute tags from backend data
  const productTags = useMemo(() => {
    if (!productData) return [] as string[];
    const tagSet = new Set<string>(); // Use Set to avoid duplicates
    
    // Get tags from the backend tags field (comma-separated string)
    if (productData.product.tags) {
      const backendTags = productData.product.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      // Check if we have specific dairy-related tags that make "milk" redundant
      const hasSpecificDairyTags = backendTags.some(tag => {
        const lowerTag = tag.toLowerCase();
        return lowerTag.includes('dairy') ||
               lowerTag.includes('vegan') ||
               lowerTag.includes('vegetarian') ||
               lowerTag.includes('pasteurized') ||
               lowerTag.includes('organic') ||
               lowerTag.includes('fresh');
      });
      
      // Filter and process backend tags
      backendTags.forEach(tag => {
        const lowerTag = tag.toLowerCase();
        
        // Skip generic "milk" tag if we have more specific dairy-related tags
        if (lowerTag === 'milk' && hasSpecificDairyTags) {
          // Skip adding generic "milk" tag
          return;
        }
        
        // Add all other tags (including milk if no specific dairy tags exist)
        tagSet.add(tag);
      });
    }
    
    // Add category as a tag if available and not already included
    if (productData.product.category?.name && !tagSet.has(productData.product.category.name)) {
      tagSet.add(productData.product.category.name);
    }
    
    // Check if dairy information is already covered by backend tags
    const tagArray = Array.from(tagSet);
    const hasDairyTag = tagArray.some(tag => {
      const lowerTag = tag.toLowerCase();
      return lowerTag.includes('dairy') || 
             lowerTag.includes('vegan') ||
             lowerTag.includes('vegetarian') ||
             lowerTag.includes('pasteurized') ||
             lowerTag === 'milk';
    });
    
    // Only add dairy information if not already covered by backend tags
    if (!hasDairyTag) {
      if (productData.product.isDairyProduct) {
        tagSet.add('Contains Dairy');
      } else {
        tagSet.add('Non-Dairy');
      }
    }
    
    return Array.from(tagSet);
  }, [productData]);

  const imgSrc = useMemo(() => {
    if (!productData) return "";
    const raw = productData.product.attachmentUrl || "";
    return raw
      ? `${import.meta.env.VITE_BACKEND_URL}${raw}`
      : `https://images.unsplash.com/photo-1546470427-0fd2788c37e3?auto=format&fit=crop&w=400&q=80`;
  }, [productData]);

  // Focus management: move focus to heading once loaded or on error
  useEffect(() => {
    if (!isLoading && (productData || fetchError)) {
      topRef.current?.focus();
    }
  }, [isLoading, productData, fetchError]);
  
  // Auto-select variant from URL or first available
  useEffect(() => {
    if (productData && !selectedVariantId) {
      const firstAvailable = productData.variants.find(v => !v.notInStock && !v.isHidden);
      if (firstAvailable) {
        setSelectedVariantId(firstAvailable.id);
      }
    }
  }, [productData, selectedVariantId]);

  const handleAddToCart = (startEl?: HTMLElement) => {
    if (!productData || !selectedVariant) return;
    // Add to cart
    try {
      // @ts-ignore - productData shape matches ProductWithPricing usage elsewhere
      addItem(productData as any, selectedVariant, quantity);
    } catch (_) {
      // noop
    }

    // Animate from button to cart icon
    try {
      const cartEl = document.getElementById("snf-cart-button");
      if (!startEl || !cartEl) return;

      // Button press micro-interaction on the clicked button/wrapper
      const prevTransform = (startEl as HTMLElement).style.transform;
      const prevTransition = (startEl as HTMLElement).style.transition;
      (startEl as HTMLElement).style.transition = `${prevTransition ? prevTransition + ', ' : ''}transform 120ms ease`;
      (startEl as HTMLElement).style.transform = "scale(0.97)";
      setTimeout(() => {
        (startEl as HTMLElement).style.transform = prevTransform;
        (startEl as HTMLElement).style.transition = prevTransition;
      }, 140);

      const startRect = startEl.getBoundingClientRect();
      const cartRect = cartEl.getBoundingClientRect();

      const flying = document.createElement("img");
      flying.src = imgSrc || "";
      flying.setAttribute("aria-hidden", "true");
      const initialSize = 56; // px
      flying.style.position = "fixed";
      flying.style.left = `${startRect.left + startRect.width / 2 - initialSize / 2}px`;
      flying.style.top = `${startRect.top + startRect.height / 2 - initialSize / 2}px`;
      flying.style.width = `${initialSize}px`;
      flying.style.height = `${initialSize}px`;
      flying.style.objectFit = "cover";
      flying.style.zIndex = "9999";
      flying.style.borderRadius = "8px";
      flying.style.pointerEvents = "none";
      flying.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";

      document.body.appendChild(flying);

      const targetX = cartRect.left + cartRect.width / 2 - (startRect.left + startRect.width / 2);
      const targetY = cartRect.top + cartRect.height / 2 - (startRect.top + startRect.height / 2);

      // Phase 1: slight lift and start movement
      const p1X = targetX * 0.2;
      const p1Y = targetY * 0.2 - 20;
      flying.style.transition = "transform 180ms ease-out, opacity 180ms ease-out";
      flying.style.transform = "translate(0px, 0px) scale(0.9)";
      flying.style.opacity = "0.9";
      requestAnimationFrame(() => {
        flying.style.transform = `translate(${p1X}px, ${p1Y}px) scale(1.02)`;
      });

      const onPhase1End = (e: TransitionEvent) => {
        if (e.propertyName !== "transform") return;
        flying.removeEventListener("transitionend", onPhase1End);
        // Phase 2: travel to cart, shrink and fade with slight rotation
        flying.style.transition = "transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms ease";
        flying.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.4) rotate(8deg)`;
        flying.style.opacity = "0.25";

        const onArrive = (ev: TransitionEvent) => {
          if (ev.propertyName !== "transform") return;
          flying.removeEventListener("transitionend", onArrive);
          // Ripple at cart icon
          const color = getComputedStyle(cartEl).color;
          const ripple = document.createElement("span");
          const cx = cartRect.left + cartRect.width / 2;
          const cy = cartRect.top + cartRect.height / 2;
          const rSize = 14;
          ripple.style.position = "fixed";
          ripple.style.left = `${cx - rSize}px`;
          ripple.style.top = `${cy - rSize}px`;
          ripple.style.width = `${rSize * 2}px`;
          ripple.style.height = `${rSize * 2}px`;
          ripple.style.border = `2px solid ${color}`;
          ripple.style.borderRadius = "9999px";
          ripple.style.opacity = "0.5";
          ripple.style.pointerEvents = "none";
          ripple.style.zIndex = "9999";
          ripple.style.transform = "scale(0.4)";
          ripple.style.transition = "transform 420ms ease, opacity 420ms ease";
          document.body.appendChild(ripple);
          requestAnimationFrame(() => {
            ripple.style.transform = "scale(1.8)";
            ripple.style.opacity = "0";
          });
          setTimeout(() => ripple.remove(), 460);

          // Cleanup flying image
          if (flying && flying.parentNode) flying.parentNode.removeChild(flying);
        };
        flying.addEventListener("transitionend", onArrive);
      };
      flying.addEventListener("transitionend", onPhase1End);
    } catch (_) {
      // noop
    }
  };

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
        {productData?.product.categoryId ? (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <a href={`/snf#category-${productData.product.categoryId}`} className="hover:underline capitalize">
                Category
              </a>
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
          onSearch={() => {
            /* noop for PDP; searching handled on landing page */
          }}
        />
      </header>

      <main id="snf-main" role="main" className="container mx-auto px-4 md:px-6 lg:px-8 py-4">
        {breadcrumb}
        <h1 ref={topRef} tabIndex={-1} className="sr-only">Product details</h1>

        {isLoading && <DetailSkeleton />}

        {fetchError && (
          <div className="border rounded-md p-6 text-center">
            <p className="text-lg font-semibold mb-2">Unable to load product</p>
            <p className="text-muted-foreground mb-4">{fetchError.message || "Unknown error"}</p>
            <div className="flex gap-2 justify-center">
              <SNFButton onClick={() => navigate(0)} aria-label="Retry loading product">Retry</SNFButton>
              <SNFButton variant="outline" onClick={() => navigate("/snf")} aria-label="Back to listing">Back to listing</SNFButton>
            </div>
          </div>
        )}

        {!isLoading && productData && (
          <>
            <article className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gallery */}
              <section aria-label="Product image gallery">
                <Gallery
                  gallery={gallery}
                  title={productData.product.name}
                  tags={productTags}
                  tagHref={(label) => {
                    const catName = productData.product.category?.name;
                    const catId = productData.product.categoryId;
                    if (catName && label === catName && catId) {
                      return `/snf/category/${catId}`;
                    }
                    const normalized = label.trim().toLowerCase();
                    if (normalized === 'non-dairy') return '/snf?tag=non-dairy';
                    if (normalized === 'contains dairy') return '/snf?tag=contains-dairy';
                    return `/snf?tag=${encodeURIComponent(normalized)}`;
                  }}
                />
              </section>

              {/* Summary */}
              <section aria-label="Product summary" className="space-y-4">
                <h2 className="text-2xl md:text-3xl font-semibold">{productData.product.name}</h2>

                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">
                    ₹{displayPrice.toFixed(2)}
                  </div>
                  {discount > 0 && (
                    <>
                      <div className="text-sm text-muted-foreground line-through">
                        ₹{mrpPrice.toFixed(2)}
                      </div>
                      <span className="bg-destructive/10 text-destructive px-2 py-1 rounded text-sm font-medium">
                        {Math.round(discount * 100)}% OFF
                      </span>
                    </>
                  )}
                </div>

                {/* Variant Selector - compact selectable squares */}
                {productData.variants.length > 1 && (
                  <div className="relative">
                    <label className="text-sm font-medium mb-2 block">Select Variant</label>
                    <div
                      role="radiogroup"
                      aria-label="Select Variant"
                      className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                    >
                      {productData.variants.map((variant) => {
                        const isSelected = variant.id === selectedVariant?.id;
                        const isAvailable = !variant.notInStock && !variant.isHidden;
                        const lowStock = variant.closingQty !== undefined && variant.closingQty > 0 && variant.closingQty <= 10;
                        return (
                          <button
                            key={variant.id}
                            role="radio"
                            aria-checked={isSelected}
                            disabled={!isAvailable}
                            onClick={() => setSelectedVariantId(variant.id)}
                            title={`${variant.name}${lowStock ? ` • Only ${variant.closingQty} left` : ''}`}
                            className={`relative h-10 min-w-[3rem] inline-flex items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent ${
                              isSelected ? 'ring-2 ring-primary border-primary bg-accent' : 'bg-background'
                            } ${!isAvailable ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
                          >
                            <span className="truncate max-w-[6rem]">{variant.name}</span>
                            {isSelected && (
                              <Check className="absolute -top-1 -right-1 h-4 w-4 text-primary bg-background rounded-full" />
                            )}
                            {!isAvailable && (
                              <span className="absolute bottom-1 text-[10px] text-muted-foreground">Out</span>
                            )}
                            {lowStock && isAvailable && (
                              <span className="absolute top-0.5 right-0.5 text-[10px] text-orange-600">Low</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Price Display */}
              
                {/* Stock Status */}
                <div className="flex items-center gap-3 text-sm">
                  {selectedVariant && !selectedVariant.notInStock ? (
                    <>
                      <span className="text-green-600 font-medium">✓ In Stock</span>
                      {/* {selectedVariant.closingQty !== undefined && (
                        <span className="text-muted-foreground">
                          {selectedVariant.closingQty > 10 
                            ? 'Available' 
                            : `Only ${selectedVariant.closingQty} left`}
                        </span>
                      )} */}
                    </>
                  ) : (
                    <span className="text-red-600 font-medium">{false && "Out of Stock"}</span>
                  )}
                  {/* <span className="text-muted-foreground">SKU: {selectedVariant?.id || 'N/A'}</span> */}
                </div>

                {/* Quantity Selector */}
                <div className="space-y-2">
                  <label htmlFor="qty" className="text-sm font-medium">Quantity</label>
                  <div className="inline-flex items-center rounded border ml-5">
                    <Button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      variant="ghost"
                      className="px-3 py-2 hover:bg-accent transition-colors"
                      aria-label="Decrease quantity"
                    >
                      -
                    </Button>
                    <Input
                      id="qty"
                      type="number"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield] w-16 text-center bg-transparent outline-none border-none"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      min="1"
                      max={selectedVariant?.closingQty || 99}
                    />
                    <Button
                      onClick={() => setQuantity(q => q + 1)}
                      variant="ghost"
                      className="px-3 py-2 hover:bg-accent transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Product Info */}
                <ul className="list-disc pl-5 text-sm space-y-1">
                  
                  <li>Quality checked and packed with care</li>
                  <li>Free delivery on qualifying orders</li>
               
                </ul>

                {/* Description */}
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h3>Description</h3>
                    <div
                    dangerouslySetInnerHTML={{
                      __html: productData.product.description || 'No description available',
                    }}
                    />
                  
           
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div ref={addBtnWrapRef} className="flex-1">
                    <SNFButton 
                      className="w-full" 
                      disabled={!selectedVariant || selectedVariant.notInStock}
                      aria-label={`Add ${productData.product.name} to cart`} 
                      fullWidth
                      onClick={() => addBtnWrapRef.current && handleAddToCart(addBtnWrapRef.current)}
                    >
                      {selectedVariant?.notInStock ? 'Out of Stock' : 'Add to Cart'}
                    </SNFButton>
                  </div>
                  <SNFButton 
                    className="flex-1 hover:bg-black" 
                    variant="secondary" 
                    disabled={!selectedVariant || selectedVariant.notInStock}
                    aria-label="Buy now" 
                    fullWidth
                  >
                    Buy Now
                  </SNFButton>
                </div>

            
              </section>
            </article>

            {/* Product content sections */}
            <section className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Accordion />
                {/* <Reviews /> */}
              </div>
              <aside className="lg:col-span-1 space-y-6">
                <TrustBadges />
                <DeliveryEstimator />
              </aside>
            </section>

            {/* Suggested products */}
            <section className="mt-12">
              <h2 className="text-xl font-semibold mb-3">Related products</h2>
              <SuggestedProducts currentId={productData.product.id} />
            </section>
          </>
        )}
      </main>

      {/* Sticky CTA */}
      {!isLoading && productData && selectedVariant && (
        <div className="sticky bottom-0 inset-x-0 bg-background border-t shadow-sm">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{productData.product.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedVariant.name} • ₹{displayPrice.toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <div ref={stickyAddBtnWrapRef}>
                <SNFButton 
                  disabled={selectedVariant.notInStock}
                  aria-label={`Add ${productData.product.name} to cart (sticky)`}
                  onClick={() => stickyAddBtnWrapRef.current && handleAddToCart(stickyAddBtnWrapRef.current)}
                >
                  {selectedVariant.notInStock ? 'Out of Stock' : 'Add to Cart'}
                </SNFButton>
              </div>
              <SNFButton 
              className="hover:bg-black"
                variant="secondary" 
                disabled={selectedVariant.notInStock}
                aria-label="Buy now (sticky)"
              >
                Buy Now
              </SNFButton>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer role="contentinfo" className="mt-10 border-t">
        <Footer />
      </footer>

      {/* SEO-like metadata injection (client-side) */}
      <SeoMeta product={productData} />
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

const SuggestedProducts: React.FC<{ currentId: number }> = ({ currentId }) => {
  // TODO: Fetch related products from API
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
      <div className="col-span-full text-center text-muted-foreground py-8">
        Related products will appear here
      </div>
    </div>
  );
};

const Gallery: React.FC<{ gallery: GalleryImage[]; title: string; tags?: string[]; tagHref?: (label: string, index: number) => string }> = ({ gallery, title, tags = [], tagHref }) => {
  const [active, setActive] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [prevFading, setPrevFading] = useState(false);
  const [entering, setEntering] = useState(true);
  // basic cross-fade, no liquid animation

  const current = gallery[active];

  useEffect(() => {
    // Ensure initial image is visible
    const id = requestAnimationFrame(() => setEntering(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const switchTo = (i: number) => {
    if (i === active) return;
    setPrevIndex(active);
    setActive(i);
    setPrevFading(false);
    setEntering(false);
    // Trigger transitions on next frame
    requestAnimationFrame(() => {
      setPrevFading(true);
      setEntering(true);
    });
    // Cleanup prev image after fade completes
    setTimeout(() => {
      setPrevIndex(null);
      setPrevFading(false);
    }, 400);
  };

  // basic transition; no liquid state

  return (
    <div className="space-y-3">
      <div className="relative rounded-md overflow-hidden border h-[360px] md:h-[420px]">
        {/* Current image (fade/scale in) */}
        <img
          key={active}
          src={current.src}
          alt={`${title} - image ${active + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-300 ease-out cursor-zoom-in ${
            entering ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
          }`}
          width={1200}
          height={420}
          loading="lazy"
          decoding="async"
        />

        {/* Previous image (cross-fade out) */}
        {prevIndex !== null && (
          <img
            key={`prev-${prevIndex}`}
            src={gallery[prevIndex].src}
            alt={`${title} - previous image ${prevIndex + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out ${
              prevFading ? "opacity-0" : "opacity-100"
            }`}
            width={1200}
            height={420}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {gallery.map((g, i) => (
          <button
            key={`thumb-${i}`}
            onClick={() => switchTo(i)}
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

      {/* Product attribute tags (clickable links to landing page anchors) */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {tags.map((t, i) => (
            <Link
              key={`p-tag-${i}`}
              to={tagHref ? tagHref(t, i) : "/snf#products"}
              className="px-2.5 py-1 rounded-full border text-xs bg-background hover:bg-accent transition-colors"
            >
              {t}
            </Link>
          ))}
        </div>
      )}
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

// Minimal client-side SEO tags injection
const SeoMeta: React.FC<{ product?: any }> = ({ product }) => {
  useEffect(() => {
    // Title and basic meta
    const prevTitle = document.title;
    const actualProduct = product?.product || product;
    if (actualProduct) document.title = `${actualProduct.name || 'Product'} | SNF`;
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
    if (actualProduct) {
      setMeta("og:title", actualProduct.name || 'Product');
      setMeta("og:type", "product");
      setMeta("og:url", window.location.href);
      setMeta("og:image", actualProduct.attachmentUrl ? `${actualProduct.attachmentUrl}&w=1200` : '');
      setMeta("og:description", actualProduct.description || '');
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
      // Get the actual product data from the nested structure
      const actualProduct = product?.product || product;
      const data = {
        "@context": "https://schema.org/",
        "@type": "Product",
        name: actualProduct?.name || "Product",
        image: actualProduct?.attachmentUrl ? [`${actualProduct.attachmentUrl}&w=1200`] : [],
        description: actualProduct?.description || "",
        sku: `SNF-${actualProduct?.id || 1}`,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: (4.5).toFixed(1), // Default rating since we don't have this field
          reviewCount: 128, // Default review count
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          price: (50).toFixed(2), // Default price since we don't have this field directly
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