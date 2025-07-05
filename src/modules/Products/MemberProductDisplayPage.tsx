import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Search, Milk, Package, Zap, Leaf, CheckCircle, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatter'; // Assuming this is your currency formatter

interface Product {
  id: number;
  name: string;
  price: number;
  rate: number;
  unit: string | null;
  description: string | null;
  attachmentUrl: string | null;
  // Example: Add a category or tag for more specific icon logic
  category?: 'dairy' | 'bakery' | 'produce' | 'pantry'; 
}

interface ApiResponse {
  data: Product[];
  // Add other pagination fields if your public API supports them
  // totalPages: number;
  // totalRecords: number;
  // currentPage: number;
}

const fetchMemberProducts = async (): Promise<Product[]> => {
  const response = await get('/products') as ApiResponse | Product[]; 
  if (Array.isArray(response)) {
    return response.map(p => ({ ...p, price: p.rate })); // Ensure price is populated if only rate is available
  } else if (response && response.data) {
    return response.data.map(p => ({ ...p, price: p.rate })); // Ensure price is populated
  }
  return []; 
};

interface EnhancedProductCardProps {
  product: Product;
  onViewDetails: (productId: number) => void;
}

const EnhancedProductCard: React.FC<EnhancedProductCardProps> = ({ product, onViewDetails }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsFavorite(!isFavorite);
    // TODO: Add logic to persist favorite state via API if needed
  };

  const getProductIcon = (category?: string, name?: string) => {
    if (category === 'dairy' || name?.toLowerCase().includes('milk') || name?.toLowerCase().includes('yogurt')) {
      // return <Milk className="w-6 h-6 text-primary" />;
    }
    if (category === 'bakery' || name?.toLowerCase().includes('bread')) {
      // return <Package className="w-6 h-6 text-primary" />;
    }
    if (category === 'produce' || name?.toLowerCase().includes('fruit') || name?.toLowerCase().includes('vegetable')) {
      return <Leaf className="w-6 h-6 text-primary" />;
    }
    return <Package className="w-6 h-6 text-gray-700" />;
  };

  const cardVariants = {
    rest: { 
      scale: 1,
      y: 0,
      boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
    },
    hover: { 
      scale: 1.03,
      y: -5,
      boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.2)",
      transition: { 
        type: "spring", 
        stiffness: 350, 
        damping: 25,
      }
    },
  };

  const imageContainerVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 }, // Subtle zoom on image container
  };

  const quickAddOverlayVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    },
  };

  const favoriteButtonVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: { scale: 1.1 },
    tap: { scale: 0.9 },
    favorite: { 
      scale: [1, 1.2, 1], 
      rotate: [0, 5, -5, 0],
      transition: { duration: 0.4, ease: "easeOut" }
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      animate="rest"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onViewDetails(product.id)} // Navigate on card click
      className="h-full rounded-xl overflow-hidden cursor-pointer" 
    >
      <Card className="relative h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-300 group">
        {/* Image Container */}
        <div className="relative h-52 sm:h-56 overflow-hidden">
          <motion.div
            variants={imageContainerVariants}
            className="h-full w-full"
          >
            {product.attachmentUrl ? (
              <img 
                src={product.attachmentUrl.startsWith('http') ? product.attachmentUrl : `${import.meta.env.VITE_BACKEND_URL}${product.attachmentUrl}`}
                alt={product.name} 
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700">
                {/* {getProductIcon(product.category, product.name)} */}
                <span className="mt-2 text-xs text-gray-700 dark:text-gray-400">No Image Available</span>
              </div>
            )}
          </motion.div>
          
          {/* Gradient Overlay for text contrast on image */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
          
          {/* Favorite Button */}
          {/* <motion.button
            onClick={handleFavorite}
            variants={favoriteButtonVariants}
            whileHover="hover"
            whileTap="tap"
            animate={isFavorite ? "favorite" : "rest"}
            className={cn(
              "absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-sm border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
              isFavorite 
                ? "bg-red-500/90 text-white border-red-600 shadow-md"
                : "bg-white/70 hover:bg-white/90 text-gray-700 border-gray-300/50 hover:border-gray-300"
            )}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
          </motion.button> */}

          {/* Fresh Badge - more prominent */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="absolute top-3 left-3 bg-primary text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center"
          >
            <Zap size={14} className="mr-1" /> Fresh
          </motion.div>

          {/* Hover Overlay for Quick Add */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                variants={quickAddOverlayVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center p-4"
                onClick={(e) => { e.stopPropagation(); onViewDetails(product.id); }} // Navigate on overlay click
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, transition: { delay: 0.1 } }}
                  className="text-white text-center"
                >
                  <Eye className="w-10 h-10 mx-auto mb-2 text-primary" />
                  <p className="text-base font-semibold">Subscribe</p>
                  <p className="text-xs text-gray-300">Click to subscribe</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <CardHeader className="pb-0 pt-4 px-4"> {/* Reduced bottom padding and added horizontal padding */}
          <div className="flex items-start justify-between space-x-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-semibold leading-tight line-clamp-2 text-gray-700 dark:text-gray-100 group-hover:text-primary dark:group-hover:text-primary transition-colors duration-200">
                {product.name}
              </CardTitle>
              {/* Reviews removed as per request */}
            </div>
            <div className="flex-shrink-0 pt-1">
              {/* {getProductIcon(product.category, product.name)} */}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow pt-0 pb-3 px-4">
          <div className="space-y-2.5">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl sm:text-2xl font-bold text-primary dark:text-primary">
                {formatCurrency(product.price)}
              </span>
              {product.unit && (
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
                  / {product.unit}
                </span>
              )}
            </div>
            
            {/* Product Description - HTML and Truncated */}
            {product.description && (
              <div 
                className="mt-2 text-xs text-gray-700 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-full"
                style={{ 
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: '4.5em',
                }}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {/* Product Features - Organic, Certified etc. */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <div className="bg-primary/10 dark:bg-primary/20 rounded-md p-2 text-center flex flex-col items-center justify-center">
                <Leaf size={16} className="text-primary dark:text-primary mb-0.5" />
                <div className="text-xs font-medium text-primary dark:text-primary">Organic</div>
              </div>
              <div className="bg-primary/10 dark:bg-primary/20 rounded-md p-2 text-center flex flex-col items-center justify-center">
                <CheckCircle size={16} className="text-primary dark:text-primary mb-0.5" />
                <div className="text-xs font-medium text-primary dark:text-primary">Certified</div>
              </div>
            </div>
          </div> {/* Closes 'space-y-2.5' */}
        </CardContent>

        <CardFooter className="pt-2 pb-4 px-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full"
          >
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 sm:py-3 shadow-md hover:shadow-lg transition-all duration-200 group text-sm sm:text-base rounded-lg"
              onClick={(e) => { e.stopPropagation(); onViewDetails(product.id); }}
              aria-label={`Subscribe for ${product.name}`}
            >
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 mr-2 transition-transform duration-200 group-hover:scale-110" />
              Subscribe
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const MemberProductDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: productsData, isLoading, isError, error } = useQuery<Product[], Error>({
    queryKey: ['memberPublicProducts'],
    queryFn: fetchMemberProducts,
  });

  const products = productsData || [];

  const handleViewDetails = (productId: number) => {
    navigate(`/member/products/${productId}`);
  };

  // Skeleton Loader for Product Card
  const ProductCardSkeleton = () => (
    <Card className="overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
      <Skeleton className="h-52 sm:h-56 w-full bg-gray-200 dark:bg-gray-700" />
      <CardHeader className="pb-2 pt-4">
        <Skeleton className="h-5 w-3/4 mb-2 bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700" />
      </CardHeader>
      <CardContent className="pt-2 pb-3">
        <Skeleton className="h-6 w-1/3 mb-2 bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-3 w-full mb-1 bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-3 w-5/6 mb-3 bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 gap-2 pt-2">
            <Skeleton className="h-10 rounded-md bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-10 rounded-md bg-gray-200 dark:bg-gray-700" />
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-4 px-4">
        <Skeleton className="h-10 sm:h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
      </CardFooter>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16">
            <Skeleton className="h-10 sm:h-12 w-3/5 sm:w-1/2 mx-auto mb-4 bg-gray-300 dark:bg-gray-700" />
            <Skeleton className="h-5 sm:h-6 w-4/5 sm:w-2/3 mx-auto bg-gray-300 dark:bg-gray-700" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="max-w-lg mx-auto bg-red-100 dark:bg-red-900/50 border-red-500 dark:border-red-700 p-6 rounded-lg shadow-xl">
            <AlertCircle className="h-6 w-6 text-red-700 dark:text-red-400" />
            <AlertTitle className="text-xl font-semibold text-red-800 dark:text-red-300">Oops! Something went wrong.</AlertTitle>
            <AlertDescription className="text-gray-700 dark:text-red-400 mt-1">
              {error?.message || 'We couldn\'t fetch the products at this moment. Please try refreshing the page or check back later.'}
            </AlertDescription>
            <Button variant="outline" className="mt-4 border-primary text-primary hover:bg-primary/10 dark:border-primary dark:text-primary dark:hover:bg-primary/20" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 text-center">
          <motion.div 
            initial={{ opacity:0, scale: 0.8 }}
            animate={{ opacity:1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Search size={72} className="mx-auto mb-6 text-primary dark:text-primary" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-700 dark:text-gray-100">
              No Products Found
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-400 max-w-md mx-auto">
              It seems we're all out of stock for now! Please check back soon for fresh arrivals.
            </p>
            <Button className="mt-8 bg-primary hover:bg-primary/90 text-white" onClick={() => window.location.reload()}>
              Check Again
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 selection:bg-primary selection:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mb-12 sm:mb-20"
        >
          <div className="flex items-center mb-4">
            <div className="p-2 bg-primary rounded-full shadow-lg mr-3">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-700">
              Our Products
            </h1>
          </div>
          <div className="w-[12rem] h-1 bg-primary rounded-full mb-4"></div>
          <p className="text-base sm:text-lg lg:text-xl text-gray-700 dark:text-gray-300 max-w-xl lg:max-w-2xl leading-relaxed">
            Explore a curated selection of farm-fresh dairy, organic groceries, and artisanal goods. Subscribe for convenience and quality, delivered to your door.
          </p>
        </motion.div>

        {/* Products Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ 
            visible: { 
              opacity: 1, 
              transition: { staggerChildren: 0.07, delayChildren: 0.2 }
            },
            hidden: { opacity: 0 }
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8"
        >
          {products.map((product) => (
            <motion.div
              key={product.id}
              variants={{ 
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
              }}
            >
              <EnhancedProductCard
                product={product}
                onViewDetails={handleViewDetails}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default MemberProductDisplayPage;

