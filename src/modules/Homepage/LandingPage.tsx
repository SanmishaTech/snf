// Landing page for milk subscription service
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Login from "../Auth/Login";
import Register from "../Auth/Register";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/formatter.js";
import { motion } from "framer-motion";
import { FaLeaf, FaTruck, FaGlassWhiskey } from "react-icons/fa";
import { FaCow,FaBars } from "react-icons/fa6";
import Banner from '@/images/banner1.webp'

interface Product {
  id: string | number;
  name: string;
  rate: number;
  url?: string | null;
  unit?: string;
}

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
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

    const userDetailsString = localStorage.getItem('user');
    if (userDetailsString) {
      try {
        const userDetails = JSON.parse(userDetailsString);
        if (userDetails && userDetails.role) {
          setCurrentUserRole(userDetails.role);
        }
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        setCurrentUserRole(null);
      }
    } else {
      setCurrentUserRole(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/'); // Redirect to home page
    window.location.reload(); // Force a reload to ensure all state is reset
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-50 w-full border-b border-muted/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-20 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-3">
              <div className="bg-primary/90 rounded-full h-10 w-10 flex items-center justify-center text-white font-bold text-xl">
                <FaCow />
              </div>
              <span className="font-bold text-2xl text-primary">Indrai</span>
            </a>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a 
              href="/member/products" 
              className="text-foreground/80 hover:text-primary transition-colors font-medium relative group"
            >
              Products
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a 
              href="#benefits" 
              className="text-foreground/80 hover:text-primary transition-colors font-medium relative group"
            >
              Benefits
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            {/* <a 
              href="#subscribe" 
              className="text-foreground/80 hover:text-primary transition-colors font-medium relative group"
            >
              Subscribe
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a> */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <a 
                href="#subscribe" 
                className="bg-primary text-white px-5 py-2 rounded-full text-sm font-medium shadow-md hover:bg-primary/90 transition-colors"
              >
                Get Started
              </a>
            </motion.div>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-foreground/80 hover:text-primary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <FaTimes className="h-6 w-6" />
            ) : (
              <FaBars className="h-6 w-6" />
            )}
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-card border-t border-muted/30"
          >
            <div className="container py-4 px-4 flex flex-col space-y-4">
              <a 
                href="#products" 
                className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Products
              </a>
              <a 
                href="#benefits" 
                className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Benefits
              </a>
              <a 
                href="#subscribe" 
                className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Subscribe
              </a>
              <motion.div 
                whileTap={{ scale: 0.95 }}
                className="pt-2"
              >
                <a 
                  href="#subscribe" 
                  className="block bg-primary text-white px-5 py-3 rounded-full text-center font-medium shadow-md hover:bg-primary/90 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </header>

      {/* Improved Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center" 
            style={{  
              backgroundImage: `url(${Banner})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              filter: "brightness(0.8)"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/0"></div>
        </div>
        
        <div className="container relative z-10 flex flex-col items-center text-center px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-primary/80">
                Fresh Milk Delivered Daily
              </span>
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mb-10">
              Subscribe to our premium milk delivery service and enjoy farm-fresh dairy products delivered straight to your doorstep.
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
      <section id="benefits" className="py-16 bg-muted/20">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Why Choose Indrai?</h2>
            <div className="flex justify-center">
              <div className="h-1 w-20 bg-primary rounded-full"></div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-card p-6 rounded-xl shadow-sm border border-muted/30 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <FaCow className="text-2xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Farm Fresh</h3>
              <p className="text-muted-foreground">Direct from our organic farms within 24 hours of milking</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-card p-6 rounded-xl shadow-sm border border-muted/30 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <FaLeaf className="text-2xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">100% Natural</h3>
              <p className="text-muted-foreground">No additives, preservatives, or artificial hormones</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-card p-6 rounded-xl shadow-sm border border-muted/30 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <FaTruck className="text-2xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Daily Delivery</h3>
              <p className="text-muted-foreground">Fresh milk at your doorstep every morning</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-card p-6 rounded-xl shadow-sm border border-muted/30 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <FaGlassWhiskey className="text-2xl" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Glass Bottles</h3>
              <p className="text-muted-foreground">Eco-friendly packaging that preserves freshness</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Split Section */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/10" id="subscribe">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Products Section */}
            <div className="space-y-8" id="products">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-3">Our Premium Selection</h2>
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
                  <p className="text-red-600">Error loading products: {error}</p>
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
                  <h3 className="text-xl font-semibold mb-2">Our Cows Are Resting</h3>
                  <p className="text-muted-foreground mb-4">No products available at the moment. Please check back later.</p>
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
                  {products.map(product => (
                    <motion.div 
                      key={product.id} 
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full">
                        <div className="h-48 overflow-hidden bg-muted/10 flex items-center justify-center">
                          {product.attachmentUrl ? (
                            <img 
                              src={`${import.meta.env.VITE_BACKEND_URL}${product.attachmentUrl}`} 
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
                          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                          <div className="flex justify-between items-center mt-auto">
                            <span className="font-medium text-primary text-lg">
                              {formatCurrency(product.rate)}
                              {product.unit && <span className="text-sm text-muted-foreground">/{product.unit}</span>}
                            </span>
                            <button 
                              className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary h-9 px-4 text-sm font-medium hover:bg-primary/20 transition-colors"
                              onClick={() => navigate(`/member/products/${product.id}`, { state: { fromLanding: true } })}
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
            {currentUserRole === 'MEMBER' ? (
              // Logout Prompt for Members
              <div className="sticky top-24 bg-card rounded-2xl shadow-lg overflow-hidden border border-muted/50 p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Welcome, Member!</h2>
                <p className="text-muted-foreground mb-6">You are already logged in.</p>
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
                <h2 className="text-2xl font-bold mb-2">Join Our Milk Club</h2>
                <p className="opacity-90">Sign in or create an account to start your subscription</p>
                </div> {/* This was the missing closing tag */}
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                    By joining, you agree to our <a href="#" className="text-primary hover:underline">Terms</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                  </p>
                </div>
              </div>
              </div>
            )} {/* End of conditional rendering for Auth Section */}
          </div>
        </div>
      </section>

   
      {/* Footer */}
      <footer className="border-t py-8 bg-muted/20">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <a href="/" className="flex items-center space-x-2">
                <div className="bg-primary/90 rounded-full h-8 w-8 flex items-center justify-center text-white">
                  <FaCow />
                </div>
                <span className="font-medium text-primary">Indrai</span>
              </a>
              <div className="mx-6 h-4 w-px bg-border hidden md:block"></div>
              <div className="text-sm text-muted-foreground">
                {new Date().getFullYear()} Indrai. All rights reserved.
              </div>
            </div>
            
            <div className="flex space-x-6">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;