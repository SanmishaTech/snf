import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as apiService from "@/services/apiService";
import HeroSection from "./Coursel";
import type { Banner as ApiBanner } from "../BannerMaster/BannerListPage";
import Header from "@/layouts/Header";
import Productdetail from "@/modules/Products/ProductDetailPage";
import { Whychoose } from "./UIcomponents/whychoose";
import A2MilkSection from "./UIcomponents/A2milkbenifits";
import { Leaf } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";

interface Product {
  id: string | number;
  name: string;
  rate: number;
  url?: string | null;
  unit?: string;
}

interface CarouselImage {
  id: string | number;
  src: string;
  alt: string;
  title?: string;
  mobileSrc: string;
}

const LandingPage = () => {
  const navigate = useNavigate();
  const [, setProducts] = useState<Product[]>([]);
  const [, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [heroBanners, setHeroBanners] = useState<CarouselImage[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3006";

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/products/public");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
          setUserName(userDetails.name || userDetails.username || userDetails.email || "User");
          if (userDetails.role) setCurrentUserRole(userDetails.role);
        }
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        setIsLoggedIn(false);
      }
    }
  }, []);

  useEffect(() => {
    const fetchHeroBanners = async () => {
      setIsLoadingBanners(true);
      setBannerError(null);
      try {
        const responseData = await apiService.get<{ banners: ApiBanner[] }>(
          "/api/admin/public/banners",
          { sortBy: "listOrder", sortOrder: "asc", limit: 7 }
        );

        if (responseData && responseData.banners && responseData.banners.length > 0) {
          const transformedBanners = responseData.banners
            .filter((banner) => banner.imagePath)
            .map((banner) => {
              const mobilePath = (banner as any).mobileImagePath 
                ? `${BACKEND_URL}${(banner as any).mobileImagePath}` 
                : `${BACKEND_URL}${banner.imagePath}`;

              return {
                id: banner.id,
                src: `${BACKEND_URL}${banner.imagePath}`,
                alt: banner.caption || `Indraai Milk Banner ${banner.id}`,
                title: banner.description || undefined,
                mobileSrc: mobilePath,
              };
            });
          setHeroBanners(transformedBanners);
        } else {
          const unsplashBanners: CarouselImage[] = [
            {
              id: "unsplash-1",
              src: "https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=2070&auto=format&fit=crop",
              mobileSrc: "https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=640&auto=format&fit=crop",
              alt: "Fresh milk in glass bottles",
              title: "Pure A2 Milk, Delivered Fresh",
            },
          ];
          setHeroBanners(unsplashBanners);
        }
      } catch (e) {
        setBannerError(e instanceof Error ? e.message : "Failed to fetch banners");
        setHeroBanners([{
          id: "unsplash-1",
          src: "https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=2070&auto=format&fit=crop",
          mobileSrc: "https://images.unsplash.com/photo-1528821128474-27f963b062bf?q=80&w=640&auto=format&fit=crop",
          alt: "Fresh milk in glass bottles",
          title: "Pure A2 Milk, Delivered Fresh",
        }]);
      } finally {
        setIsLoadingBanners(false);
      }
    };

    fetchHeroBanners();
  }, [BACKEND_URL]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
    window.location.reload();
  };

  const showWallet = isLoggedIn && currentUserRole === "MEMBER";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        userName={userName ?? undefined}
        onLogout={handleLogout}
        showWallet={showWallet}
      />

      <section className="relative mt-25">
        <div className="relative w-full">
          {!isLoadingBanners && heroBanners.length > 0 && (
            <HeroSection images={heroBanners} />
          )}
        </div>
      </section>

      <section id="benefits" className="py-8 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-3 text-[#c8202f]">
              Indraai
            </h2>
            <div className="flex justify-center mb-6">
              <div className="h-1 w-20 bg-[#c8202f] rounded-full"></div>
            </div>
            <p className="text-lg max-w-7xl text-gray-800 leading-relaxed text-justify">
              Indraai combines two words Indriya (Senses) that connect the soul
              - Atma to the physical world and Aai (Mother) - i.e., the food
              from the mother to nourish the senses.
              <br /><br />
              Indraai is a brand of <a className="hover:text-green-800 font-bold transition-colors" href="https://sarkhotnaturalfarms.com/">Sarkhot Natural Farms</a> that aims to give wholesome pure food, without addition of any artificial substances.
              <br /><br />
              The Dairy and Processed products such as A2 ghee, A2 Ghee ladoos, Woodpressed oils, Namkeen etc. are marketed under the brand name of Indraai.
            </p>
          </div>
          
          <div id="product-detail-section">
            <Productdetail />
          </div>

          <div className="block">
            <Whychoose />
          </div>

          <div>
            <A2MilkSection />
          </div>
        </div>
      </section>

      <section className="py-6 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              The way we satisfy the demand of A2 Milk
            </h2>
            <div className="w-32 md:w-48 h-1 bg-[#c8202f] rounded-full mx-auto mb-4"></div>
            <p className="text-sm md:text-base text-gray-700 max-w-4xl mx-auto leading-relaxed text-justify">
              Absolutely nothing—we don't regulate milk supply based on demand.
              Our milk comes directly from the Bharwad community, who have been
              rearing Gir cows for generations, without any external chemicals
              or additives to boost production.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
             <div className="bg-white rounded-xl shadow-md p-4 h-full hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">Native Heritage</h3>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  The Desi Gir cow originates in the Gir Forest of Gujarat, India. She's distinguished by a pronounced hump and loose skin around her neck.
                </p>
             </div>
             <div className="bg-white rounded-xl shadow-md p-4 h-full hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">Natural Milking Cycle</h3>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  On each farm, some Gir cows are in their milking phase while others rest. Calves always feed first.
                </p>
             </div>
             <div className="bg-white rounded-xl shadow-md p-4 h-full hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">Essential Bulls</h3>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  Gir bulls assist with agricultural work and help sustain the herd through natural breeding.
                </p>
             </div>
          </div>
        </div>
      </section>

      <AppFooter />
      <div className="md:hidden">
        <BottomNavBar />
      </div>
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
              <a href="https://sarkhotnaturalfarms.com/" className="text-xl font-bold text-green-700">Sarkhot Natural Farms</a>
            </div>
            <p className="text-sm mb-6 leading-relaxed">
              <a href="https://sarkhotnaturalfarms.com/" className="text-green-700 mr-1">Sarkhot Natural Farms</a>
              denote the community of natural farmers. Natural means <span className="font-semibold text-red-500">💯%</span> chemical free.
            </p>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-md font-semibold mb-4 border-b-2 border-[#c8202f] pb-1 inline-block">Policies</h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/privacy-policy" className="hover:text-green-600 transition-colors">Privacy Policy</a></li>
              <li><a href="/refund-policy" className="hover:text-green-600 transition-colors">Refund Policy</a></li>
              <li><a href="/shipping-policy" className="hover:text-green-600 transition-colors">Shipping Policy</a></li>
              <li><a href="/terms-conditions" className="hover:text-green-600 transition-colors">Terms and Conditions</a></li>
            </ul>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-md font-semibold mb-4 border-b-2 border-[#c8202f] pb-1 inline-block">Useful Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/" className="hover:text-green-600 transition-colors">Home</a></li>
              <li><a href="/member/products" className="hover:text-green-600 transition-colors">Products</a></li>
              <li><a href="/about" className="hover:text-green-600 transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-green-600 transition-colors">Contact Us</a></li>
            </ul>
          </div>
          <div className="md:col-span-4 lg:col-span-3">
            <h3 className="text-md font-semibold mb-4 border-b-2 border-[#c8202f] pb-1 inline-block">Store Location</h3>
            <address className="text-sm not-italic space-y-2 leading-relaxed">
              <p><a className="hover:text-green-800 font-bold transition-colors" href="https://sarkhotnaturalfarms.com/">Sarkhot Natural Farms</a>, Shop no 3, Chidghan society, Dombivli East - 421201</p>
              <p>Near Brahman Sabha hall.</p>
              <p><a href="mailto:sarkhotnaturalfarms@gmail.com" className="hover:text-green-600 transition-colors break-all">sarkhotnaturalfarms@gmail.com</a></p>
              <p><a href="tel:+919920999100" className="hover:text-green-600 transition-colors">+91 9920999100</a></p>
            </address>
          </div>
        </div>
      </div>
      <div className="bg-gray-200 dark:bg-gray-800 py-4 border-t border-gray-300">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
          <p>&copy; {new Date().getFullYear()} <a className="hover:text-green-800 font-bold transition-colors" href="https://sarkhotnaturalfarms.com/">Sarkhot Natural Farms</a>. All Rights Reserved.</p>
          <p>Powered by <a href="https://sanmisha.com/" className="font-semibold text-primary hover:underline">Sanmisha Technologies</a></p>
        </div>
      </div>
    </footer>
  );
};

export default LandingPage;