//Vipul
import { useEffect } from "react";
import { appName } from "./config"; // Import appName from config
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";
import AdminProtectedRoute from "./layouts/AdminProtectedRoute"; // Added for admin route protection

import MemberLayout from "./layouts/MemberLayout";
import WastageList from "./modules/Wastage/WastageList";
import CreateWastagePage from "./modules/Wastage/CreateWastagePage";
import EditWastagePage from "./modules/Wastage/EditWastagePage";
import Login from "./modules/Auth/Login";
import VarientstockListPage from "./modules/Varientstock/VarientstockListPage";
import Register from "./modules/Auth/Register";
import ForgotPassword from "./modules/Auth/ForgotPassword";
import ResetPassword from "./modules/Auth/ResetPassword";
import UserList from "./modules/User/UserList";
import UserForm from "./modules/User/UserForm";
import AdminMemberEditPage from "./modules/User/AdminMemberEditPage"; // Added for editing member details
import VendorList from "./modules/Vendor/VendorList";
import AgencyList from "./modules/Agency/AgencyList"
import CreateVendorPage from "./modules/Vendor/CreateVendorPage";
import EditVendorPage from "./modules/Vendor/EditVendorPage";
import CreateAgencyPage from "./modules/Agency/CreateAgencyPage";
import EditAgencyPage from "./modules/Agency/EditAgencyPage";
import Orderlist from "./modules/Order/OrderList";
import CreateOrderPage from "./modules/Order/CreateOrderPage"
import OrderDetailsPage from "./modules/Order/OrderDetailsPage"
import EditOrderPage from "./modules/Order/EditOrderPage";
import OrderDeliveryPage from "./modules/Order/OrderDeliveryPage"
// import OrderHistoryPage from './modules/member/OrderHistoryPage'; // File not found, commented out
import MySubscriptionsPage from './modules/member/MySubscriptionsPage'; // Added for member subscriptions
import ManageSubscriptionPage from './modules/member/ManageSubscriptionPage'; // Added for managing individual subscriptions
import OrderReceivedPage from "./modules/Order/OrderReceivedPage"; // Added for admin receipt recording
import ProductList from "./modules/Products/ProductList"
import LandingPage from "./modules/Homepage/LandingPage"; // Added for milk subscription landing page
import AboutUsPage from "./modules/StaticPages/AboutUsPage"; // Added for About Us page
import Bharwadcow from "./modules/StaticPages/Bharwadcow"; // Added for About Us page

import ContactUsPage from "./modules/StaticPages/ContactUsPage"; // Added for Contact Us page
import GratitudePage from "./modules/StaticPages/GratitudePage"; // Added for Gratitude page
import PrivacyPolicy from "./pages/PrivacyPolicy"; // Added for Privacy Policy page
import RefundPolicy from "./pages/RefundPolicy"; // Added for Refund Policy page
import ShippingPolicyPage from "./modules/StaticPages/ShippingPolicyPage"; // Added for Shipping Policy page
import TermsAndConditionsPage from "./modules/StaticPages/TermsAndConditionsPage"; // Added for Terms and Conditions page
import CreateProductPage from "./modules/Products/CreateProductPage";
import EditProductPage from "./modules/Products/EditProductPage";
import ProductDetailPage from "./modules/Products/ProductDetailPage"; // Added for product detail page
import ProductDetailWrapper from "./components/ProductDetailWrapper"; // Wrapper for conditional layout
import MemberProductDisplayPage from "./modules/Products/MemberProductDisplayPage"; // Added for member product display
import AddressListPage from "./modules/Address/AddressListPage";
import CreateAddressPage from "./modules/Address/CreateAddressPage";
import EditAddressPage from "./modules/Address/EditAddressPage";
import { Toaster } from "sonner";
import AdminSubscriptionList from "./modules/AdminSubscription/AdminSubscriptionList"; // Added for admin subscriptions list
import AgencyDeliveryView from "./modules/agency-delivery/AgencyDeliveryView"; // Added for agency delivery management
import WalletAdmin from "./modules/Wallet/AdminWalletPage";
import AdminMembersListPage from "./modules/Wallet/AdminMembersListPage"; // Added for Admin Members List Page
import AreaMasterListPage from "./modules/Areamaster/AreaMasterListPage"; // Added for Area Master Management
import CategoryMasterListPage from "./modules/CategoryMaster/CategoryMasterListPage"; // Added for Category Master Management
import CityMasterListPage from "./modules/CityMaster/CityMasterListPage";
import LocationMasterListPage from "./modules/LocationMaster/LocationMasterListPage";
import DepotMasterListPage from "./modules/DepotMaster/DepotMasterListPage"; // Added for Depot Master Management
import DepotProductVariantListPage from "./modules/DepotProductVariant/DepotProductVariantListPage"; // Added for Depot Product Variant Management
import Teams from "./modules/Teams/Teams"; // Added for Teams Management
import BannerListPage from "./modules/BannerMaster/BannerListPage"; // Added for Banner Master Management
import UserWallet from "./modules/Wallet/UserWallet";
import PurchaseList from "./modules/Purchase/PurchaseList";
import CreatePurchasePage from "./modules/Purchase/CreatePurchasePage";
import EditPurchasePage from "./modules/Purchase/EditPurchasePage";
import PurchasePaymentListPage from "./modules/PurchasePayment/PurchasePaymentListPage";
import PurchasePaymentForm from "./modules/PurchasePayment/PurchasePaymentForm";
import PurchasePaymentViewPage from "./modules/PurchasePayment/PurchasePaymentViewPage";
import TransferList from "./modules/Transfer/TransferList";
import CreateTransferPage from "./modules/Transfer/CreateTransferPage";
import EditTransferPage from "./modules/Transfer/EditTransferPage";

import DepotOrderDetails from "./modules/Order/DepotOrderDetails";
import "./App.css";
// MembershipList wrapper component to handle showing all memberships
 
 
 

const App = () => {
  useEffect(() => {
    document.title = appName; // Set the document title
  }, []);

  return (
    <>
      <Toaster richColors position="top-center" />
      <Router>
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />}>
            <Route path="products/:id" element={<ProductDetailWrapper />} />
          </Route>
          
          {/* Auth routes with minimal layout */}
          <Route element={<AuthLayout />}>
            <Route path="/admin" element={<Login />} />
            <Route path="/admin/register" element={<Register />} /> {/* Admin registration with AuthLayout */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Route>

          {/* Public routes with MemberLayout (includes navbar/footer) */}
          <Route element={<MemberLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/bharwadcow" element={<Bharwadcow />} />
            <Route path="/contact" element={<ContactUsPage />} />
            <Route path="/gratitude" element={<GratitudePage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route path="/register" element={<Register />} />
          </Route>
          {/* Protected Admin Routes with MainLayout */}
          <Route element={<AdminProtectedRoute><MainLayout /></AdminProtectedRoute>}>
            <Route path="/admin/dashboard" element={<div className="space-y-4 ml-4">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p>Welcome to your dashboard. Here you can manage orders.</p>
              {/* Dashboard content would go here */}
            </div>} />
            <Route path="/admin/users" element={<UserList />} />
            <Route path="/admin/variantstock" element={<VarientstockListPage />} />
            <Route path="/admin/users/create" element={<UserForm mode='create' />} />
            <Route path="/admin/users/edit/:id" element={<UserForm mode='edit' />} />
            <Route path="/admin/vendors" element={<VendorList />} />
            <Route path="/admin/wastages" element={<WastageList />} />
            <Route path="/admin/wastages/create" element={<CreateWastagePage />} />
            <Route path="/admin/wastages/edit/:id" element={<EditWastagePage />} />
            <Route path="/admin/transfers" element={<TransferList />} />
            <Route path="/admin/transfers/create" element={<CreateTransferPage />} />
            <Route path="/admin/transfers/edit/:id" element={<EditTransferPage />} />
            <Route path="/admin/vendors/create" element={<CreateVendorPage />} /> 
            <Route path="/admin/vendors/edit/:id" element={<EditVendorPage />} /> 
            <Route path="/admin/agencies" element={<AgencyList />} />
            <Route path="/admin/agencies/create" element={<CreateAgencyPage />} />
            <Route path="/admin/agencies/edit/:id" element={<EditAgencyPage />} />
            <Route path="/admin/orders" element={<Orderlist />} />
            <Route path="/admin/orders/create" element={<CreateOrderPage />} />
            <Route path="/admin/orders/:id" element={<OrderDetailsPage />} />
            <Route path="/admin/orders/:id/edit" element={<EditOrderPage />} />
            <Route path="/admin/orders/:id/record-receipt" element={<OrderReceivedPage />} /> {/* New route for recording receipt */}
            <Route path="/admin/purchases" element={<PurchaseList />} />
            <Route path="/admin/purchases/create" element={<CreatePurchasePage />} />
            <Route path="/admin/purchases/edit/:id" element={<EditPurchasePage />} />
            <Route path="/admin/purchase-payments" element={<PurchasePaymentListPage />} />
            <Route path="/admin/purchase-payments/create" element={<PurchasePaymentForm />} />
            <Route path="/admin/purchase-payments/:id" element={<PurchasePaymentViewPage />} />
            <Route path="/admin/products" element={<ProductList />} />
            <Route path="/admin/wallet" element={<WalletAdmin />} />
            <Route path="/admin/members" element={<AdminMembersListPage />} /> {/* Added for Admin Members List Page */}
            <Route path="/admin/members/:memberId/edit" element={<AdminMemberEditPage />} /> {/* Added for editing member details */}
            <Route path="/admin/products/create" element={<CreateProductPage />} />
            <Route path="/admin/products/edit/:id" element={<EditProductPage />} />
            <Route path="/admin/products/:id" element={<ProductDetailPage />} /> {/* New route for product detail */}
            <Route path="/admin/subscriptions" element={<AdminSubscriptionList />} />
            <Route path="/depot-order-details" element={<DepotOrderDetails />} /> {/* Added for admin subscriptions list */}
            <Route path="/admin/delivery" element={<AgencyDeliveryView />} /> {/* Added for agency delivery management */}
            <Route path="/admin/categories" element={<CategoryMasterListPage />} /> {/* Route for Category Master */}
            <Route path="/admin/cities" element={<CityMasterListPage />} />
            <Route path="/admin/locations" element={<LocationMasterListPage />} />
            <Route path="/admin/areamasters" element={<AreaMasterListPage />} /> {/* Added for Area Master Management */}
              <Route path="/admin/depots" element={<DepotMasterListPage />} /> {/* Added for Depot Master Management */}
            <Route path="/admin/teams" element={<Teams />} /> {/* Added for Teams Management */}
            <Route path="/admin/banners" element={<BannerListPage />} /> {/* Added for Banner Master Management */}
            <Route path="/admin/depot-variants" element={<DepotProductVariantListPage />} /> {/* Added for Depot Product Variant Management */}
          </Route>

          {/* Other routes using MainLayout (e.g., Vendor routes) - not protected by AdminProtectedRoute */}
          <Route element={<MainLayout />}> 
            {/* Vendor specific routes */}
            <Route path="/vendor/orders/:id" element={<OrderDetailsPage />} />
            <Route path="/vendor/orders/:id/record-delivery" element={<OrderDeliveryPage />} />
            {/* Add any other non-admin routes here that should use MainLayout but not admin protection */}
          </Route>
          
          {/* Member specific routes with MemberLayout */}
          <Route element={<MemberLayout />}>
          
            <Route path="/member/orders" element={<Orderlist />} />
            <Route path="/member/orders/:id" element={<OrderDetailsPage />} />
            <Route path="/member/products" element={<MemberProductDisplayPage />} /> {/* Member product display page */}
            <Route path="/member/products/:id" element={<ProductDetailPage />} /> {/* New route for member product detail */}
            <Route path="/member/profile" element={<div className="space-y-4">
              <h1 className="text-2xl font-bold">Profile Management</h1>
              <p>Manage your personal information and preferences here.</p>
             </div>} />
            <Route path="/member/addresses" element={<AddressListPage />} />
            <Route path="/member/wallet" element={<UserWallet />} />

            <Route path="/member/addresses/create" element={<CreateAddressPage />} />
            <Route path="/member/addresses/edit/:id" element={<EditAddressPage />} />
            <Route path="/member/subscriptions" element={<MySubscriptionsPage />} />
            <Route path="/manage-subscription/:id" element={<ManageSubscriptionPage />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
};

export default App;