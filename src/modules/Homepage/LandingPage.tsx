// Landing page for milk subscription service
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
 
import { Leaf } from "lucide-react"; // For AppFooter
 
// import Banner from '@/images/banner1.webp'; // Replaced by dynamic banners
import * as apiService from "@/services/apiService";
import HeroSection from "./Coursel";
import type { Banner as ApiBanner } from "../BannerMaster/BannerListPage"; // Renamed to avoid conflict if Banner is used locally
import Header from "@/layouts/Header";
  // Removed local product filtering state; navigation to /snf is used instead
import { Whychoose } from "./UIcomponents/whychoose";
import A2MilkSection from "./UIcomponents/A2milkbenifits";
import { productService } from "@/modules/SNF/services/api";
// Product interface kept previously for landing fetch; no longer used

interface CarouselImage {
  id: string; // Made 'id' required as per lint error indication
  src: string;
  alt: string;
  title?: string;
  mobileSrc: string; // Required to match HeroImage
}

type LandingCategory = {
  id: string;
  name: string;
  imageUrl?: string;
};

/**
 * The main landing page component for the milk subscription service.
 *
 * This component is the entry point for the user and renders the main sections of the page, including the hero section, benefits section, and product detail section.
 *
 * @returns The JSX element for the landing page.
 */
const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
 
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [heroBanners, setHeroBanners] = useState<CarouselImage[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  // helper for admin check
 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [categories, setCategories] = useState<LandingCategory[]>([]);
  const [catLoading, setCatLoading] = useState<boolean>(false);
  const [catError, setCatError] = useState<string | null>(null);
 

  // Mobile image mapping - Add your mobile images here
  const mobileImageMap: Record<string, string> = {
    // Map banner IDs to mobile image paths
    // Example: "banner-1": "/images/mobile/banner-1-mobile.jpg",
    // "banner-2": "/images/mobile/banner-2-mobile.jpg",
    // Add more mappings as needed
  };

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  useEffect(() => {
    // Redirect legacy category tag links like /?tag=category:ID to the new category route
    const params = new URLSearchParams(location.search || "");
    const tagRaw = params.get("tag");
    if (tagRaw && tagRaw.toLowerCase().startsWith("category:")) {
      const idStr = tagRaw.split(":")[1] || "";
      const idNum = parseInt(idStr, 10);
      if (Number.isFinite(idNum)) {
        navigate(`/snf/category/${idNum}`, { replace: true });
        return; // avoid running the rest on this render
      }
    }

    // Load user details
    // Fetch categories for landing page navigation
    const fetchCategories = async () => {
      setCatLoading(true);
      setCatError(null);
      try {
        const data = await productService.getCategories();
        const normalized: LandingCategory[] = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: String(c.id ?? c._id ?? c.slug ?? ""),
          name: c.name || c.title || "Category",
          imageUrl: c.imageUrl || c.attachmentUrl || c.iconUrl || c.url || undefined,
        }));
        const sortedCats = [...normalized].sort((a, b) => {
          const aMilk = typeof a.name === "string" && a.name.toLowerCase().includes("milk") ? 1 : 0;
          const bMilk = typeof b.name === "string" && b.name.toLowerCase().includes("milk") ? 1 : 0;
          if (aMilk !== bMilk) return bMilk - aMilk;
          return (a.name || "").localeCompare(b.name || "");
        });
        setCategories(sortedCats);
      } catch (e: any) {
        setCatError(e?.message || "Failed to load categories");
      } finally {
        setCatLoading(false);
      }
    };

    fetchCategories();

    
    const userDetailsString = localStorage.getItem("user");
    if (userDetailsString) {
      try {
        const userDetails = JSON.parse(userDetailsString);
        if (userDetails) {
          setIsLoggedIn(true);
          setUserName(
            userDetails.name ||
              userDetails.username ||
              userDetails.email ||
              "User"
          ); // Adjust based on your user object
          if (userDetails.role) {
            setCurrentUserRole(userDetails.role);
          }
        }
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        setCurrentUserRole(null);
        setIsLoggedIn(false);
        setUserName(null);
      }
    } else {
      setCurrentUserRole(null);
      setIsLoggedIn(false);
      setUserName(null);
    }
  }, []);

  useEffect(() => {
    const fetchHeroBanners = async () => {
      setIsLoadingBanners(true);
      setBannerError(null);
      try {
        const responseData = await apiService.get<{ banners: ApiBanner[] }>(
          "/api/admin/public/banners", // Updated to use the new public endpoint
          { sortBy: "listOrder", sortOrder: "asc", limit: 7 } // Fetch active banners, sorted
        );

        if (
          responseData &&
          responseData.banners &&
          responseData.banners.length > 0
        ) {
          const transformedBanners = responseData.banners
            .filter((banner) => banner.imagePath)
            .map((banner) => {
              const mobileImagePath =
                mobileImageMap[banner.id] || `${BACKEND_URL}${banner.imagePath}`;

              return {
                id: banner.id,
                src: `${BACKEND_URL}${banner.imagePath}`,
                alt: banner.caption || `Indraai Milk Banner ${banner.id}`,
                title: banner.description || undefined,
                mobileSrc: mobileImagePath,
              } as CarouselImage;
            });
          setHeroBanners(transformedBanners);
        } else {
          // Use Unsplash images as fallback when no banners from API
          const unsplashBanners: CarouselImage[] = [
            {
              id: "unsplash-1",
              src: "https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=2070&auto=format&fit=crop",
              mobileSrc:
                "https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=640&auto=format&fit=crop",
              alt: "Fresh milk in glass bottles",
              title: "Pure A2 Milk, Delivered Fresh",
            },
            {
              id: "unsplash-2",
              src: "https://images.unsplash.com/photo-1516640000-9951dfc3c8d1?q=80&w=2070&auto=format&fit=crop",
              mobileSrc:
                "https://images.unsplash.com/photo-1516640000-9951dfc3c8d1?q=80&w=640&auto=format&fit=crop",
              alt: "Cows grazing in green pasture",
              title: "From Happy Cows to Your Home",
            },
            {
              id: "unsplash-3",
              src: "https://images.unsplash.com/photo-1523473827533-2a64d0d36748?q=80&w=2080&auto=format&fit=crop",
              mobileSrc:
                "https://images.unsplash.com/photo-1523473827533-2a64d0d36748?q=80&w=640&auto=format&fit=crop",
              alt: "Dairy farm at sunrise",
              title: "Natural, Ethical, Sustainable",
            },
          ];
          setHeroBanners(unsplashBanners);
        }
      } catch (e) {
        const errorMsg =
          e instanceof Error
            ? e.message
            : "Failed to fetch banners for hero section";
        console.error("Error fetching hero banners:", errorMsg);
        setBannerError(errorMsg);

        // Use Unsplash images as fallback on error
          const unsplashBanners: CarouselImage[] = [
          {
            id: "unsplash-1",
            src: "https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=2070&auto=format&fit=crop",
            mobileSrc:
              "https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=640&auto=format&fit=crop",
            alt: "Fresh milk in glass bottles",
            title: "Pure A2 Milk, Delivered Fresh",
          },
          {
            id: "unsplash-2",
            src: "https://images.unsplash.com/photo-1516640000-9951dfc3c8d1?q=80&w=2070&auto=format&fit=crop",
            mobileSrc:
              "https://images.unsplash.com/photo-1516640000-9951dfc3c8d1?q=80&w=640&auto=format&fit=crop",
            alt: "Cows grazing in green pasture",
            title: "From Happy Cows to Your Home",
          },
          {
            id: "unsplash-3",
            src: "https://images.unsplash.com/photo-1523473827533-2a64d0d36748?q=80&w=2080&auto=format&fit=crop",
            mobileSrc:
              "https://images.unsplash.com/photo-1523473827533-2a64d0d36748?q=80&w=640&auto=format&fit=crop",
            alt: "Dairy farm at sunrise",
            title: "Natural, Ethical, Sustainable",
          },
        ];
        setHeroBanners(unsplashBanners);
      } finally {
        setIsLoadingBanners(false);
      }
    };

    fetchHeroBanners();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/"); // Redirect to home page
    window.location.reload(); // Force a reload to ensure all state is reset
  };

  const showWallet = isLoggedIn && currentUserRole === "MEMBER";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        userName={userName || undefined}
        onLogout={handleLogout}
        showWallet={showWallet}
      />

      <section className="relative mt-25">
        <div className="relative w-full">
          {isLoadingBanners && (
            <div className="absolute inset-0 flex items-center justify-center ">
              <p>Loading images...</p>
            </div>
          )}
          {!isLoadingBanners && bannerError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-100">
              <p className="text-red-700">
                Could not load banner images: {bannerError}
              </p>
            </div>
          )}
          {!isLoadingBanners && !bannerError && heroBanners.length > 0 && (
            <HeroSection images={heroBanners} />
          )}
        </div>
      </section>

      <section id="benefits" className="py-8 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center text-primary mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-3 text-primary">
              Indraai
            </h2>
            <div className="flex justify-center mb-6">
              <div className="h-1 w-20  rounded-full"></div>
            </div>
            <p className="text-lg max-w-7xl text-gray-800 leading-relaxed text-justify">
              Indraai combines two words Indriya (Senses) that connect the soul
              - Atma to the physical world and Aai (Mother) - i.e., the food
              from the mother to nourish the senses.
              <br />
              <br />
              Indraai is a brand of{" "}
              <a
                className="hover:text-green-800 font-bold dark:hover:text-green-400 transition-colors"
                href="https://sarkhotnaturalfarms.com/"
              >
                Sarkhot Natural Farms
              </a>{" "}
              that aims to give wholesome pure food, without addition of any
              artificial substances.
              <br />
              <br />
              The Dairy and Processed products such as A2 ghee, A2 Ghee ladoos,
              Woodpressed oils, Namkeen etc. are marketed under the brand name
              of Indraai.
            </p>
          </div>
          {/* Browse by Category - navigates to SNF page with category preselected */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-semibold">Browse by Category</h3>
              {catError && (
                <button
                  className="text-sm underline"
                  onClick={() => {
                    // simple retry
                    (async () => {
                      setCatLoading(true);
                      setCatError(null);
                      try {
                        const data = await productService.getCategories();
                        const normalized: LandingCategory[] = (Array.isArray(data) ? data : []).map((c: any) => ({
                          id: String(c.id ?? c._id ?? c.slug ?? ""),
                          name: c.name || c.title || "Category",
                          imageUrl: c.imageUrl || c.attachmentUrl || c.iconUrl || c.url || undefined,
                        }));
                        const sortedCats = [...normalized].sort((a, b) => {
                          const aMilk = typeof a.name === "string" && a.name.toLowerCase().includes("milk") ? 1 : 0;
                          const bMilk = typeof b.name === "string" && b.name.toLowerCase().includes("milk") ? 1 : 0;
                          if (aMilk !== bMilk) return bMilk - aMilk;
                          return (a.name || "").localeCompare(b.name || "");
                        });
                        setCategories(sortedCats);
                      } catch (e: any) {
                        setCatError(e?.message || "Failed to load categories");
                      } finally {
                        setCatLoading(false);
                      }
                    })();
                  }}
                >
                  Retry
                </button>
              )}
            </div>
            {catLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square w-full rounded-lg bg-muted/30" />
                    <div className="h-3 w-2/3 bg-muted/40 rounded mt-3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {categories.map((cat) => {
                  const catIdNum = parseInt(cat.id, 10);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => navigate(`/snf/category/${catIdNum}`)}
                      className={`group text-left`}
                      aria-label={`View ${cat.name} products`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-full border bg-accent/10">
                        {cat.imageUrl ? (
                          <img
                            src={`${import.meta.env.VITE_BACKEND_URL}${cat.imageUrl}`}
                            alt={cat.name}
                            className="h-full w-full object-cover rounded-full transition-transform duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-muted-foreground bg-gradient-to-br from-muted/30 to-transparent rounded-full">
                            {cat.name?.charAt(0) || "C"}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 text-center">
                        <p className={`text-sm font-medium line-clamp-2 group-hover:text-primary`}>
                          {cat.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {categories.length === 0 && !catError && (
                  <p className="col-span-2 sm:col-span-3 lg:col-span-6 text-muted-foreground">
                    No categories available.
                  </p>
                )}
              </div>
            )}
          </section>

          <div id="product-detail-section" />

          <div className="block">
            <Whychoose />
          </div>
          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-2 max-w-7xl mx-auto bg-white">
            {[
              {
                title: "Loving Bond & Ethical Cow Care",
                description: "Our cows are treated with love, respect, and care by dedicated bharwads. We practice cruelty-free, humane farming with traditional hand-milking methods that preserve the gentle bond between humans and animals.",
                icon: <FaHeart className="h-6 w-6" />,
              },
              {
                title: "Pure & Natural Milk Quality",
                description: "Pure A2 Gir cow milk with zero adulteration, no antibiotics, no hormones, and no artificial additives. Just natural, unadulterated goodness straight from our indigenous Gir cows.",
                icon: <FaShieldAlt className="h-6 w-6" />,
              },
              {
                title: "Free Grazing & Natural Nutrition",
                description: "Our cows roam freely on open pastures, feeding naturally on fresh grass and herbs. This stress-free environment and natural diet contribute to healthier cows and superior milk quality.",
                icon: <GiGrassMushroom className="h-6 w-6" />,
              },
              {
                title: "Freshness & Daily Collection",
                description: "Milk collected fresh at dawn and delivered the same day to preserve maximum nutritional value, taste, and natural goodness. Farm-to-table freshness guaranteed.",
                icon: <FaTruck className="h-6 w-6" />,
              },
              {
                title: "Quality Assurance & Eco-Friendly Packaging",
                description: "Premium glass bottle packaging that preserves milk purity while being environmentally responsible. Our sustainable approach ensures quality while protecting our planet.",
                icon: <FaGlassWhiskey className="h-6 w-6" />,
              },
              {
                title: "Superior Nutritional Value",
                description: "Rich in proteins, vitamins, minerals, and essential nutrients with enhanced digestibility and bioavailability. A2 protein makes it easier to digest compared to regular milk.",
                icon: <GiMilkCarton className="h-6 w-6" />,
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className={cn(
                  "relative overflow-hidden rounded-lg border p-2",
                  // Apply left border on the first item of each row
                  index % 3 === 0 ? "md:border-l" : "",
                  // Apply right border on the last item of each row
                  index % 3 === 2 ? "md:border-r" : "",
                  // Apply top border on the first row
                  index < 3 ? "md:border-t" : "",
                  // Apply bottom border on all rows
                  "md:border-b"
                )}
              >
                <div className="group relative  p-6 h-full">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary">
                    {feature.icon}
                  </div>
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-gray-700">
                      {feature.description}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div> */}

          <div>
            <A2MilkSection />
          </div>
        </div>
      </section>

      <section className="py-6 bg-white">
        <div className="container max-w-6xl mx-auto px-4 bg-white">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              The way we satisfy the demand of A2 Milk
            </h2>
            <div className="w-32 md:w-48 h-1 bg-primary rounded-full mx-auto mb-4"></div>
            <p className="text-sm md:text-base text-gray-700 max-w-4xl mx-auto leading-relaxed text-justify">
              Absolutely nothing—we don't regulate milk supply based on demand.
              Our milk comes directly from the Bharwad community, who have been
              rearing Gir cows for generations, without any external chemicals
              or additives to boost production.
            </p>
            <p className="text-sm md:text-base text-gray-700 max-w-4xl mx-auto leading-relaxed mt-2 text-justify">
              Instead, the Bharwad community's relationship with Desi Gir cows
              transcends today's commercial mindset:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="group">
              <div className="bg-white rounded-xl shadow-md p-4 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                  Native Heritage
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  The Desi Gir cow originates in the Gir Forest of Gujarat,
                  India. She's distinguished by a pronounced hump and loose skin
                  around her neck, celebrated for her gentle disposition and
                  remarkable resilience in any climate.
                </p>
              </div>
            </div>

            <div className="group">
              <div className="bg-white rounded-xl shadow-md p-4 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                  Natural Milking Cycle
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  On each farm, some Gir cows are in their milking phase while
                  others rest. Calves always feed first; any remaining milk is
                  then collected by the farmer. Cows not lactating receive the
                  same dedicated care until the end of their natural lives.
                </p>
              </div>
            </div>

            <div className="group">
              <div className="bg-white rounded-xl shadow-md p-4 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                  Essential Bulls
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  Gir bulls assist with agricultural work and help sustain the
                  herd through natural breeding, ensuring the continuation of
                  the breed's legacy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

const AppFooter = () => {
  return (
    <footer className="bg-slate-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-10">
          <div className="md:col-span-12 lg:col-span-4">
            <div className="mb-6 flex items-center">
              <Leaf className="h-10 w-10 text-green-600 mr-3" />
              <a
                href="https://sarkhotnaturalfarms.com/"
                className="text-xl font-bold text-green-700 dark:text-green-500"
              >
                Sarkhot Natural Farms
              </a>
            </div>
            <p className="text-sm mb-6 leading-relaxed">
              <a
                href="https://sarkhotnaturalfarms.com/"
                className="  text-green-700 dark:text-green-500 mr-1"
              >
                Sarkhot Natural Farms
              </a>
              denote the community of natural farmers. Natural means{" "}
              <span className="font-semibold text-red-500">💯%</span> chemical
              free, preservative free and poison free.
            </p>
            <h3 className="text-[0.9rem] font-semibold mb-3 text-gray-600 dark:text-gray-400">
              Payment Accepted
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              {["Mastercard", "Discover", "BitPay", "Visa", "Stripe"].map(
                (method) => (
                  <span
                    key={method}
                    className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md shadow-sm"
                  >
                    {method}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-1"></div>

          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-md font-semibold mb-4    border-b-2 border-primary pb-1 inline-block">
              Policies
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="/privacy-policy"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/refund-policy"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  Refund and Returns Policy
                </a>
              </li>
              <li>
                <a
                  href="/shipping-policy"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  Shipping and delivery policy
                </a>
              </li>
              <li>
                <a
                  href="/terms-conditions"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  Terms and Conditions
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-md font-semibold mb-4    border-b-2 border-primary pb-1 inline-block">
              Useful Links
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="/"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/member/products"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  Products
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 lg:col-span-3">
            <h3 className="text-md font-semibold mb-4  dark  border-b-2 border-primary pb-1 inline-block">
              Store Location
            </h3>
            <address className="text-sm not-italic space-y-2 leading-relaxed">
              <p>
                <a
                  className="hover:text-green-800 font-bold dark:hover:text-green-400 transition-colors"
                  href="https://sarkhotnaturalfarms.com/"
                >
                  Sarkhot Natural Farms
                </a>
                , Shop no 3, Chidghan society, Opp. Maharashtra Steel, Tilak
                cross Phadke Road, Dombivli East - 421201
              </p>
              <p>
                <strong className="text-gray-800 dark:text-gray-200">
                  Landmark
                </strong>{" "}
                - Near Brahman Sabha hall.
              </p>
              <p>
                <a
                  href="mailto:sarkhotnaturalfarms@gmail.com"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors break-all"
                >
                  sarkhotnaturalfarms@gmail.com
                </a>
              </p>
              <p>
                <a
                  href="tel:+919920999100"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  +91 9920999100
                </a>
              </p>
            </address>
          </div>
        </div>
      </div>

      <div className="bg-gray-200 dark:bg-gray-800 py-4 border-t border-gray-300 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 dark:text-gray-400">
          <p className="mb-2 md:mb-0 text-center md:text-left">
            &copy; {new Date().getFullYear()}{" "}
            <a
              className="hover:text-green-800 font-bold dark:hover:text-green-400 transition-colors"
              href="https://sarkhotnaturalfarms.com/"
            >
              Sarkhot Natural Farms
            </a>
            . All Rights Reserved.
          </p>
          <p className="text-center md:text-right">
            Powered by{" "}
            <a
              href="https://sanmisha.com/"
              className="font-semibold text-primary dark:text-primary hover:underline"
            >
              Sanmisha Technologies
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingPage;
