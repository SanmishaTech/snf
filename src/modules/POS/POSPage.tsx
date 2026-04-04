import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ShoppingCart, CreditCard, LayoutGrid } from "lucide-react";
import { posService, Member, Product, CartItem, ProductVariant } from "./posService";
import { getCurrentUser } from "@/utils/auth";
import { CustomerSidebar } from "./components/CustomerSidebar";
import { ProductGrid } from "./components/ProductGrid";
import { CheckoutSidebar } from "./components/CheckoutSidebar";

// Types
interface POSCustomer {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  walletBalance: number;
}

export default function POSPage() {
  const queryClient = useQueryClient();
  // Get current user to determine depot
  const currentUser = getCurrentUser();
  const depotId = currentUser?.depotId || 1;

  // UI state for responsiveness
  const [activeTab, setActiveTab] = useState("products");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Customer state (with persistence)
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(() => {
    try {
      const saved = localStorage.getItem("pos_selected_customer");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", mobile: "", email: "" });

  // Cart state (with persistence)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("pos_cart");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Product state
  const [productSearch, setProductSearch] = useState("");

  // Checkout state
  const [paymentMode, setPaymentMode] = useState<"CASH" | "WALLET" | "UPI" | "CHEQUE" | "CARD">("CASH");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [paymentRefNo, setPaymentRefNo] = useState("");
  const [payerName, setPayerName] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Fetch all members on mount
  const { data: allMembersData, isLoading: membersLoading } = useQuery({
    queryKey: ["pos-all-members"],
    queryFn: () => posService.searchMembers("*"), // Get all members
    staleTime: 5 * 60 * 1000, 
  });

  const allMembers = allMembersData?.data || [];

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return allMembers;
    const query = searchQuery.toLowerCase();
    return allMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.mobile.toLowerCase().includes(query) ||
        (m.email && m.email.toLowerCase().includes(query))
    );
  }, [allMembers, searchQuery]);

  // Handle clicking outside to close member dropdown
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Persist session to localStorage
  useEffect(() => {
    localStorage.setItem("pos_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("pos_selected_customer", JSON.stringify(selectedCustomer));
  }, [selectedCustomer]);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["pos-products", depotId],
    queryFn: () => posService.getDepotProducts(depotId),
    enabled: !!depotId,
  });

  const products = productsData?.data || [];

  // Select customer
  const handleSelectCustomer = (member: Member) => {
    if (member === null) {
      setSelectedCustomer(null);
      return;
    }
    setSelectedCustomer({
      id: member.id,
      name: member.name,
      mobile: member.mobile,
      email: member.email || undefined,
      walletBalance: member.walletBalance,
    });
    setSearchQuery("");
    setShowMemberDropdown(false);
  };

  // Quick register customer
  const registerMutation = useMutation({
    mutationFn: posService.quickRegisterMember,
    onSuccess: (res) => {
      toast.success("Customer registered successfully");
      handleSelectCustomer(res.data);
      setShowNewCustomerForm(false);
      setNewCustomer({ name: "", mobile: "", email: "" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register customer");
    },
  });

  const handleRegisterCustomer = () => {
    if (!newCustomer.name || !newCustomer.mobile) {
      toast.error("Name and mobile are required");
      return;
    }
    registerMutation.mutate(newCustomer);
  };

  // Add to cart
  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    const existingItemIdx = cart.findIndex(
      (item) => item.variantId === variant.id
    );

    if (existingItemIdx > -1) {
      const existingItem = cart[existingItemIdx];
      // Check stock
      if (existingItem.quantity >= variant.stock) {
        toast.error("Insufficient stock");
        return;
      }

      const updatedCart = [...cart];
      updatedCart[existingItemIdx] = { ...existingItem, quantity: existingItem.quantity + 1 };
      setCart(updatedCart);
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${variant.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        price: Number(variant.price),
        quantity: 1,
        imageUrl: product.imageUrl,
      };
      setCart([...cart, newItem]);
    }
  };

  // Update quantity
  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    // Find max stock
    const product = products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    const maxStock = variant?.stock || 0;

    if (newQuantity > maxStock) {
      toast.error(`Only ${maxStock} items available in stock`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.08; // 8% as per screenshot
  const tax = subtotal * taxRate;
  const totalAmount = subtotal + tax;

  // Create order
  const orderMutation = useMutation({
    mutationFn: posService.createOrder,
    onSuccess: (res) => {
      toast.success(`Order created: ${res.data.orderNo}`);
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      setCompletedOrder(res.data);
      setShowReceipt(true);
      setIsCheckoutOpen(false); // Close mobile sheet
      setCart([]);
      setSelectedCustomer(null);
      localStorage.removeItem("pos_cart");
      localStorage.removeItem("pos_selected_customer");
      setProductSearch("");
      setPaymentMode("CASH");
      setCashReceived(0);
      setPaymentRefNo("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create order");
    },
  });

  const handleCreateOrder = () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    // For wallet payment, check balance
    let walletAmount = 0;
    if (paymentMode === "WALLET") {
        if (selectedCustomer.walletBalance < totalAmount) {
            toast.error(`Insufficient balance. Available: ₹${selectedCustomer.walletBalance}`);
            return;
        }
        walletAmount = totalAmount;
    }

    if (paymentMode === "CASH" && cashReceived < totalAmount) {
        toast.error("Insufficient cash received");
        return;
    }

    if (paymentMode === "UPI" && !paymentRefNo) {
        toast.error("Please enter UPI reference number");
        return;
    }

    orderMutation.mutate({
      memberId: selectedCustomer.id,
      customer: {
        name: selectedCustomer.name,
        mobile: selectedCustomer.mobile,
        email: selectedCustomer.email || null,
      },
      items: cart.map((item) => ({
        name: item.productName,
        variantName: item.variantName,
        price: item.price,
        quantity: item.quantity,
        depotProductVariantId: item.variantId,
      })),
      subtotal,
      totalAmount,
      walletamt: walletAmount,
      paymentMode,
      paymentRefNo,
      payerName,
      chequeNo,
      bankName,
      transactionId,
      paymentDetails,
      depotId,
    });
  };

  // Close receipt and reset
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setCompletedOrder(null);
  };

  return (
    <div className="h-full bg-[#f8fafc] flex flex-col overflow-hidden">
      
      {/* Mobile View: Tabs Navigation */}
      <div className="flex md:hidden flex-1 overflow-hidden">
        <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
          <div className="bg-white border-b px-4 py-2">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl bg-slate-100 p-1 border-none">
              <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs gap-2">
                <LayoutGrid className="w-4 h-4" /> Products
              </TabsTrigger>
              <TabsTrigger value="cart" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs gap-2">
                <ShoppingCart className="w-4 h-4" /> Cart ({cart.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            <TabsContent value="products" className="h-full m-0 p-0 overflow-hidden">
              <ProductGrid 
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                products={products}
                productsLoading={productsLoading}
                handleAddToCart={handleAddToCart}
              />
            </TabsContent>
            <TabsContent value="cart" className="h-full m-0 p-0 overflow-hidden">
              <CustomerSidebar 
                selectedCustomer={selectedCustomer}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showMemberDropdown={showMemberDropdown}
                setShowMemberDropdown={setShowMemberDropdown}
                filteredMembers={filteredMembers}
                handleSelectCustomer={handleSelectCustomer}
                setShowNewCustomerForm={setShowNewCustomerForm}
                membersLoading={membersLoading}
                cart={cart}
                handleUpdateQuantity={handleUpdateQuantity}
                handleRemoveItem={handleRemoveItem}
                subtotal={subtotal}
                tax={tax}
                totalAmount={totalAmount}
                memberDropdownRef={memberDropdownRef}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Mobile Summary Bar & Floating Sheet */}
      <div className="md:hidden bg-white border-t p-4 px-6 flex items-center justify-between shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] z-20">
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Amount</div>
          <div className="text-xl font-black text-slate-900 leading-none">₹{Number(totalAmount || 0).toFixed(2)}</div>
        </div>
        
        <Sheet open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <SheetTrigger asChild>
            <Button 
               disabled={cart.length === 0 || !selectedCustomer}
               className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 px-6 font-bold shadow-lg shadow-blue-100 gap-2"
            >
              <CreditCard className="w-4 h-4" /> Checkout
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-[2.5rem] p-0 border-none bg-[#E6EFF5] overflow-hidden flex flex-col">
            <SheetHeader className="sr-only">
              <SheetTitle>Checkout Summary</SheetTitle>
              <SheetDescription>Review your order and process payment</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
                <CheckoutSidebar 
                    totalAmount={totalAmount}
                    paymentMode={paymentMode}
                    setPaymentMode={setPaymentMode as any}
                    cashReceived={cashReceived} setCashReceived={setCashReceived}
                    paymentRefNo={paymentRefNo} setPaymentRefNo={setPaymentRefNo}
                    payerName={payerName} setPayerName={setPayerName}
                    chequeNo={chequeNo} setChequeNo={setChequeNo}
                    bankName={bankName} setBankName={setBankName}
                    transactionId={transactionId} setTransactionId={setTransactionId}
                    paymentDetails={paymentDetails} setPaymentDetails={setPaymentDetails}
                    handleCreateOrder={handleCreateOrder}
                    isProcessing={orderMutation.isPending}
                    canCheckout={cart.length > 0 && !!selectedCustomer}
                    selectedCustomer={selectedCustomer}
                />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop View: Three Column Grid */}
      <div className="hidden md:flex h-full overflow-hidden">
        {/* 1st Column - Customer & Cart */}
        <CustomerSidebar 
          selectedCustomer={selectedCustomer}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showMemberDropdown={showMemberDropdown}
          setShowMemberDropdown={setShowMemberDropdown}
          filteredMembers={filteredMembers}
          handleSelectCustomer={handleSelectCustomer}
          setShowNewCustomerForm={setShowNewCustomerForm}
          membersLoading={membersLoading}
          cart={cart}
          handleUpdateQuantity={handleUpdateQuantity}
          handleRemoveItem={handleRemoveItem}
          subtotal={subtotal}
          tax={tax}
          totalAmount={totalAmount}
          memberDropdownRef={memberDropdownRef}
        />

        {/* 2nd Column - Product Catalog */}
        <ProductGrid 
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          products={products}
          productsLoading={productsLoading}
          handleAddToCart={handleAddToCart}
        />

        {/* 3rd Column - Checkout Summary */}
                 <CheckoutSidebar 
                    totalAmount={totalAmount}
                    paymentMode={paymentMode}
                    setPaymentMode={setPaymentMode}
                    cashReceived={cashReceived} setCashReceived={setCashReceived}
                    paymentRefNo={paymentRefNo} setPaymentRefNo={setPaymentRefNo}
                    payerName={payerName} setPayerName={setPayerName}
                    chequeNo={chequeNo} setChequeNo={setChequeNo}
                    bankName={bankName} setBankName={setBankName}
                    transactionId={transactionId} setTransactionId={setTransactionId}
                    paymentDetails={paymentDetails} setPaymentDetails={setPaymentDetails}
                    handleCreateOrder={handleCreateOrder}
                    isProcessing={orderMutation.isPending}
                    canCheckout={cart.length > 0 && !!selectedCustomer}
                    selectedCustomer={selectedCustomer}
                />
      </div>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerForm} onOpenChange={setShowNewCustomerForm}>
        <DialogContent className="rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">Quick Registration</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">Add a new customer to the database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Customer Name *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Enter full name"
                className="h-12 bg-slate-50 border-none rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Mobile Number *</Label>
              <Input
                value={newCustomer.mobile}
                onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                placeholder="10-digit number"
                className="h-12 bg-slate-50 border-none rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</Label>
              <Input
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="optional@email.com"
                className="h-12 bg-slate-50 border-none rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl font-bold text-slate-500" onClick={() => setShowNewCustomerForm(false)}>
              Discard
            </Button>
            <Button
              onClick={handleRegisterCustomer}
              disabled={registerMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-8 h-12 shadow-lg shadow-blue-200"
            >
              {registerMutation.isPending ? "Creating..." : "Save Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
             <DialogTitle>Order Successful</DialogTitle>
             <DialogDescription>Receipt for your recent purchase.</DialogDescription>
          </DialogHeader>
          <div className="p-8">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-100">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                <h2 className="font-black text-2xl text-slate-800">Success!</h2>
                <p className="text-slate-400 text-sm font-medium">Order #{completedOrder?.orderNo}</p>
            </div>

            {completedOrder && (
                <div className="space-y-6">
                <div className="space-y-3 px-2">
                    {completedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-600">
                        {item.name} <span className="text-slate-300 font-medium ml-1">x{item.quantity}</span>
                        </span>
                        <span className="font-black text-slate-800">₹{Number(item.lineTotal || 0).toFixed(2)}</span>
                    </div>
                    ))}
                </div>

                <div className="border-t border-slate-100 pt-6 px-2">
                    <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Paid</span>
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">₹{Number(completedOrder.totalAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-300 text-right uppercase tracking-widest font-black">
                    {new Date(completedOrder.createdAt).toLocaleString()}
                    </div>
                </div>
                </div>
            )}
          </div>

          <div className="bg-slate-50 p-6 flex flex-col gap-2">
            <Button className="w-full bg-slate-800 hover:bg-slate-900 text-white h-14 rounded-2xl font-bold shadow-xl shadow-slate-100" onClick={() => window.print()}>
              Print Receipt
            </Button>
            <Button variant="ghost" className="w-full h-12 rounded-xl font-bold text-slate-400" onClick={handleCloseReceipt}>
              Close & New Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
