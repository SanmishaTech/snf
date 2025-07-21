// Landing page for milk subscription service
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Login from "../Auth/Login";
import Register from "../Auth/Register";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/formatter.js";
import { motion } from "framer-motion";
import Cows from "./images/cows.png"
import {
  FaTruck,
  FaGlassWhiskey,
  FaTimes,
  FaHeart,
  FaShieldAlt,
} from "react-icons/fa";
import { FaCow, FaBars } from "react-icons/fa6";
import { GiMilkCarton, GiGrassMushroom } from "react-icons/gi";
import { cn } from "@/lib/utils";
import { Leaf } from "lucide-react"; // For AppFooter
// import Banner from '@/images/banner1.webp'; // Replaced by dynamic banners
import * as apiService from "@/services/apiService";
import HeroSection from "./Coursel";
import type { Banner as ApiBanner } from "../BannerMaster/BannerListPage"; // Renamed to avoid conflict if Banner is used locally
import Header from "@/layouts/Header";
import Productdetail from "@/modules/Products/ProductDetailPage";
import { Whychoose } from "./UIcomponents/whychoose";
import A2MilkSection from "./UIcomponents/A2milkbenifits";
interface Product {
  id: string | number;
  name: string;
  rate: number;
  url?: string | null;
  unit?: string;
}

interface CarouselImage {
  id: string; // Made 'id' required as per lint error indication
  src: string;
  alt: string;
  title?: string;
  mobileSrc?: string; // Optional mobile image source
}

/**
 * The main landing page component for the milk subscription service.
 *
 * This component is the entry point for the user and renders the main sections of the page, including the hero section, benefits section, and product detail section.
 *
 * @returns The JSX element for the landing page.
 */
const LandingPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [heroBanners, setHeroBanners] = useState<CarouselImage[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  // helper for admin check
  const adminRoles: string[] = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR"];
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Mobile image mapping - Add your mobile images here
  const mobileImageMap: Record<string, string> = {
    // Map banner IDs to mobile image paths
    // Example: "banner-1": "/images/mobile/banner-1-mobile.jpg",
    // "banner-2": "/images/mobile/banner-2-mobile.jpg",
    // Add more mappings as needed
  };

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "https://www.indraai.in//";
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/products/public");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Product[] = await response.json();
        setProducts(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
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

        if (responseData && responseData.banners && responseData.banners.length > 0) {
          const transformedBanners = responseData.banners
            .filter((banner) => banner.imagePath)
            .map((banner) => {
              // Check if there's a mobile image mapping for this banner
              const mobileImagePath =
                mobileImageMap[banner.id] ||
                (banner.mobileImagePath
                  ? `${BACKEND_URL}${banner.mobileImagePath}`
                  : `${BACKEND_URL}${banner.imagePath}`);

              return {
                id: banner.id,
                src: `${BACKEND_URL}${banner.imagePath}`,
                alt: banner.caption || `Indraai Milk Banner ${banner.id}`,
                title: banner.description || undefined,
                mobileSrc: mobileImagePath, // Now always has a value
              };
            });
          setHeroBanners(transformedBanners);
        } else {
          // Use Unsplash images as fallback when no banners from API
          const unsplashBanners: CarouselImage[] = [
            {
              id: 'unsplash-1',
              src: 'https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=2070&auto=format&fit=crop',
              mobileSrc: 'https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=640&auto=format&fit=crop',
              alt: 'Fresh milk in glass bottles',
              title: 'Pure A2 Milk, Delivered Fresh',
            },
            {
              id: 'unsplash-2',
              src: 'https://images.unsplash.com/photo-1516640000-9951dfc3c8d1?q=80&w=2070&auto=format&fit=crop',
              mobileSrc: 'https://images.unsplash.com/photo-1516640000-9951dfc3c8d1?q=80&w=640&auto=format&fit=crop',
              alt: 'Cows grazing in green pasture',
              title: 'From Happy Cows to Your Home',
            },
            {
              id: 'unsplash-3',
              src: 'https://images.unsplash.com/photo-1523473827533-2a64d0d36748?q=80&w=2080&auto=format&fit=crop',
              mobileSrc: 'https://images.unsplash.com/photo-1523473827533-2a64d0d36748?q=80&w=640&auto=format&fit=crop',
              alt: 'Dairy farm at sunrise',
              title: 'Natural, Ethical, Sustainable',
            }
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
            id: 'unsplash-1',
            src: 'https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=2070&auto=format&fit=crop',
            mobileSrc: 'https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=640&auto=format&fit=crop',
            alt: 'Fresh milk in glass bottles',
            title: 'Pure A2 Milk, Delivered Fresh',
          },
          {
            id: 'unsplash-2',
            src: 'https://images.unsplash.com/photo-1516640000-9951dfc3c8d1?q=80&w=2070&auto=format&fit=crop',
            mobileSrc: 'https://images.unsplash.com/photo-1516640000-9951dfc3c8d1?q=80&w=640&auto=format&fit=crop',
            alt: 'Cows grazing in green pasture',
            title: 'From Happy Cows to Your Home',
          },
          {
            id: 'unsplash-3',
            src: 'https://images.unsplash.com/photo-1523473827533-2a64d0d36748?q=80&w=2080&auto=format&fit=crop',
            mobileSrc: 'https://images.unsplash.com/photo-1523473827533-2a64d0d36748?q=80&w=640&auto=format&fit=crop',
            alt: 'Dairy farm at sunrise',
            title: 'Natural, Ethical, Sustainable',
          }
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
        userName={userName}
        onLogout={handleLogout}
        showWallet={showWallet}
      />

      {/*  Hero Section */}
      <section className="relative mt-25">
        {/* Hero Section Container */}
        <div className="relative w-full">
          {isLoadingBanners && (
            <div className="absolute inset-0 flex items-center justify-center ">
              <p>Loading images...</p> {/* Or a spinner component */}
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
          {/* {!isLoadingBanners && !bannerError && heroBanners.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <p>No banner images available.</p>
            </div>
          )} */}
          {/* Dark overlay for text contrast */}
          {/* <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/0"></div> */}
          {/* The above gradient was removed to reduce 'white aura'. If text legibility on carousel is an issue, consider a darker, simpler overlay e.g., bg-black/30 */}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center text-primary mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-3 text-primary">Indraai</h2>
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

      <div id="product-detail-section">
        <Productdetail />
      </div>

      {/* A2 Milk Demand Section */}
      <section className="py-16   ">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The way we satisfy the demand of A2 Milk
            </h2>
            <div className="w-[46rem] max-md:w-36 h-1 bg-primary rounded-full mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed text-justify">
              Absolutely nothing—we don't regulate milk supply based on demand.
              Our milk comes directly from the Bharwad community, who have been
              rearing Gir cows for generations, without any external chemicals
              or additives to boost production.
            </p>
            <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed mt-4 text-justify">
              Instead, the Bharwad community's relationship with Desi Gir cows
              transcends today's commercial mindset:
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Feature 1: Native Breed */}
            <div className="group">
              <div className="bg-white rounded-2xl shadow-lg p-8 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-center w-16 h-16 bg-orange-200 rounded-full mb-6 mx-auto group-hover:bg-primary/20 transition-colors">
                  <FaCow className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  Native Heritage
                </h3>
                <p className="text-gray-600 leading-relaxed text-center">
                  The Desi Gir cow originates in the Gir Forest of Gujarat,
                  India. She's distinguished by a pronounced hump and loose skin
                  around her neck, celebrated for her gentle disposition and
                  remarkable resilience in any climate.
                </p>
              </div>
            </div>

            {/* Feature 2: Respectful Practices */}
            <div className="group">
              <div className="bg-white rounded-2xl shadow-lg p-8 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-6 mx-auto group-hover:bg-primary/20 transition-colors">
                  <FaHeart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  Natural Milking Cycle
                </h3>
                <p className="text-gray-600 leading-relaxed text-center">
                  On each farm, some Gir cows are in their milking phase while
                  others rest. Calves always feed first; any remaining milk is
                  then collected by the farmer. Cows not lactating receive the
                  same dedicated care until the end of their natural lives.
                </p>
              </div>
            </div>

            {/* Feature 3: Gir Bull Role */}
            <div className="group">
              <div className="bg-white rounded-2xl shadow-lg p-8 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 mx-auto group-hover:bg-blue-200 transition-colors">
                  <FaShieldAlt className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  Essential Bulls
                </h3>
                <p className="text-gray-600 leading-relaxed text-center">
                  Gir bulls assist with agricultural work and help sustain the
                  herd through natural breeding, ensuring the continuation of
                  the breed's legacy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <AppFooter />
    </div>
  );
};

// New AppFooter component
const AppFooter = () => {
  return (
    <footer className="bg-slate-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-10">
          {/* Column 1: Logo, Description, Payment */}
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

          {/* Spacer for large screens to push link columns to the right */}
          <div className="hidden lg:block lg:col-span-1"></div>

          {/* Column 2: Policies */}
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

          {/* Column 3: Useful Links */}
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

          {/* Column 4: Contact */}
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

      {/* Sub-Footer */}
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
