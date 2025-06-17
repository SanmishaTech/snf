// Landing page for milk subscription service
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Login from "../Auth/Login";
import Register from "../Auth/Register";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/formatter.js";
import { motion } from "framer-motion";
import { FaLeaf, FaTruck, FaGlassWhiskey, FaTimes } from "react-icons/fa";
import { FaCow, FaBars } from "react-icons/fa6";
import { Leaf } from "lucide-react"; // For AppFooter
// import Banner from '@/images/banner1.webp'; // Replaced by dynamic banners
import * as apiService from "@/services/apiService";
import InfiniteImageCarousel from "./Coursel"; // Assuming Coursel.tsx exports this
import type { Banner as ApiBanner } from "../BannerMaster/BannerListPage"; // Renamed to avoid conflict if Banner is used locally
import Header from "@/layouts/Header";

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
}

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

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
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

        if (responseData && responseData.banners) {
          const transformedBanners = responseData.banners
            .filter((banner) => banner.imagePath)
            .map((banner) => ({
              id: banner.id,
              src: `${BACKEND_URL}${banner.imagePath}`,
              alt: banner.caption || `Indraai Milk Banner ${banner.id}`,
              title: banner.description || undefined,
            }));
          setHeroBanners(transformedBanners);
        } else {
          setHeroBanners([]);
        }
      } catch (e) {
        const errorMsg =
          e instanceof Error
            ? e.message
            : "Failed to fetch banners for hero section";
        console.error("Error fetching hero banners:", errorMsg);
        setBannerError(errorMsg);
        setHeroBanners([]);
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
      <section className="relative h-[600px] max-md:h-[600px] max-lg:h-[800px] py-24 md:py-32">
        {" "}
        {/* Hero Section - Check if text is legible after removing gradient overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {isLoadingBanners && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
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
            <InfiniteImageCarousel images={heroBanners} />
          )}
          {!isLoadingBanners && !bannerError && heroBanners.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <p>No banner images available.</p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/30"></div>{" "}
          {/* Dark overlay for text contrast */}
          {/* <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/0"></div> */}
          {/* The above gradient was removed to reduce 'white aura'. If text legibility on carousel is an issue, consider a darker, simpler overlay e.g., bg-black/30 */}
        </div>
        <div className="container absolute bottom-32 left-0 right-0 z-10 flex flex-col items-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 ">
              <span className="bg-clip-text ">Fresh Milk Delivered Daily</span>
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mb-10">
              Subscribe to our premium milk delivery service and enjoy
              farm-fresh dairy products delivered straight to your doorstep.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <a
                href="#subscribe"
                className="inline-flex items-center justify-center rounded-full bg-white text-primary px-8 py-4 text-lg font-medium shadow-lg hover:bg-gray-50 transition-colors"
              >
                Start Your Subscription
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16">
        {" "}
        {/* Removed bg-muted/20 */}
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Why Choose Indraai?
            </h2>
            <div className="flex justify-center">
              <div className="h-1 w-20 bg-primary rounded-full"></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-card p-6 rounded-xl border border-muted/30 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <FaCow className="text-2xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Farm Fresh</h3>
              <p className="text-muted-foreground">
                Direct from our organic farms within 24 hours of milking
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="bg-card p-6 rounded-xl border border-muted/30 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <FaLeaf className="text-2xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">100% Natural</h3>
              <p className="text-muted-foreground">
                No additives, preservatives, or artificial hormones
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="bg-card p-6 rounded-xl border border-muted/30 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <FaTruck className="text-2xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Daily Delivery</h3>
              <p className="text-muted-foreground">
                Fresh milk at your doorstep every morning
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="bg-card p-6 rounded-xl border border-muted/30 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <FaGlassWhiskey className="text-2xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Glass Bottles</h3>
              <p className="text-muted-foreground">
                Eco-friendly packaging that preserves freshness
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Split Section */}
      <section
        className="py-24 bg-gradient-to-b from-background to-muted/10"
        id="subscribe"
      >
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Products Section */}
            <div className="space-y-8" id="products">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-3">
                  Our Premium Selection
                </h2>
                <div className="h-1 w-20 bg-primary rounded-full"></div>
              </div>

              {isLoading && (
                <div className="grid sm:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="overflow-hidden animate-pulse">
                      <div className="h-48 bg-muted/50" />
                      <CardContent className="p-5">
                        <div className="h-6 bg-muted/50 rounded mb-4 w-3/4"></div>
                        <div className="h-8 bg-muted/50 rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-600">
                    Error loading products: {error}
                  </p>
                  <button
                    className="mt-4 text-sm text-primary hover:underline"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!isLoading && !error && products.length === 0 && (
                <div className="bg-card rounded-xl p-8 text-center border border-muted/30">
                  <div className="bg-muted/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FaCow className="text-2xl text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Our Cows Are Resting
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    No products available at the moment. Please check back
                    later.
                  </p>
                  <button
                    className="text-sm text-primary hover:underline"
                    onClick={() => window.location.reload()}
                  >
                    Check Again
                  </button>
                </div>
              )}

              {!isLoading && !error && products.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <motion.div
                      key={product.id}
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full">
                        <div className="h-48 overflow-hidden bg-muted/10 flex items-center justify-center">
                          {product.attachmentUrl ? (
                            <img
                              src={`${import.meta.env.VITE_BACKEND_URL}${
                                product.attachmentUrl
                              }`}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform hover:scale-105"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-muted-foreground p-4">
                              <FaCow className="text-4xl mb-2" />
                              <span className="text-sm">Fresh Milk</span>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-5 flex flex-col flex-grow">
                          <h3 className="font-semibold text-lg mb-2">
                            {product.name}
                          </h3>
                          <div className="flex justify-between items-center mt-auto">
                            <span className="font-medium text-primary text-lg">
                              {formatCurrency(product.rate)}
                              {product.unit && (
                                <span className="text-sm text-muted-foreground">
                                  /{product.unit}
                                </span>
                              )}
                            </span>
                            <button
                              className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary h-9 px-4 text-sm font-medium hover:bg-primary/20 transition-colors"
                              onClick={() =>
                                navigate(`/member/products/${product.id}`, {
                                  state: { fromLanding: true },
                                })
                              }
                            >
                              View Details
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            {/* Auth Section - Enhanced - Conditionally rendered based on user role */}
            {currentUserRole === "MEMBER" ? (
              // Logout Prompt for Members
              <div className="sticky top-24 bg-card rounded-2xl shadow-lg overflow-hidden border border-muted/50 p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Welcome, Member!</h2>
                <p className="text-muted-foreground mb-6">
                  You are already logged in.
                </p>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Logout
                </button>
              </div>
            ) : (
              // Original Auth Section for non-members
              <div className="sticky top-24 bg-card rounded-2xl shadow-lg overflow-hidden border border-muted/50">
                <div className="bg-gradient-to-r from-primary/90 to-primary p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">
                    Join Our Milk Club
                  </h2>
                  <p className="opacity-90">
                    Sign in or create an account to start your subscription
                  </p>
                </div>{" "}
                {/* This was the missing closing tag */}
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <div className="px-6 pt-6 pb-2">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/10 p-1.5 rounded-xl border border-muted/30">
                      <TabsTrigger
                        value="login"
                        className="px-4 py-3 rounded-lg font-medium text-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-primary/80"
                      >
                        Login
                      </TabsTrigger>
                      <TabsTrigger
                        value="register"
                        className="px-4 py-3 rounded-lg font-medium text-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-primary/80"
                      >
                        Register
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-6 pt-2">
                    <TabsContent value="login">
                      <Login setActiveTab={setActiveTab} />
                    </TabsContent>
                    <TabsContent value="register">
                      <Register setActiveTab={setActiveTab} />
                    </TabsContent>
                  </div>
                </Tabs>
                <div className="px-6 pb-6">
                  <div className="border-t border-muted/30 pt-6 text-center">
                    <p className="text-muted-foreground text-sm">
                      By joining, you agree to our{" "}
                      <a href="#" className="text-primary hover:underline">
                        Terms
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}{" "}
            {/* End of conditional rendering for Auth Section */}
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
              <span className="text-2xl font-bold text-green-700 dark:text-green-500">
                Sarkhot Natural Farms
              </span>
            </div>
            <p className="text-sm mb-6 leading-relaxed">
              Sarkhot Natural farms denote the community of natural farmers.
              Natural means{" "}
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
            <h3 className="text-md font-semibold mb-4 text-green-700 dark:text-green-500 border-b-2 border-green-500 pb-1 inline-block">
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
            <h3 className="text-md font-semibold mb-4 text-green-700 dark:text-green-500 border-b-2 border-green-500 pb-1 inline-block">
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
                  Shop
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
            <h3 className="text-md font-semibold mb-4 text-green-700 dark:text-green-500 border-b-2 border-green-500 pb-1 inline-block">
              Contact
            </h3>
            <address className="text-sm not-italic space-y-2 leading-relaxed">
              <p>
                Sarkhot Natural Farms, Shop no 3, Chidghan society, Opp.
                Maharashtra Steel, Tilak cross Phadke Road, Dombivli East -
                421201
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
            &copy; {new Date().getFullYear()} Sarkhot Natural Farms. All Rights
            Reserved.
          </p>
          <p className="text-center md:text-right">
            Powered by{" "}
            <a
              href="#"
              className="font-semibold text-green-700 dark:text-green-500 hover:underline"
            >
              Brospro
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingPage;
