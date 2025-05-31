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
import MemberLayout from "./layouts/MemberLayout";
import Login from "./modules/Auth/Login";
import Register from "./modules/Auth/Register";
import ForgotPassword from "./modules/Auth/ForgotPassword";
import ResetPassword from "./modules/Auth/ResetPassword";
import UserList from "./modules/User/UserList";
import UserForm from "./modules/User/UserForm";
import VendorList from "./modules/Vendor/VendorList";
import AgencyList from "./modules/Agency/AgencyList"
import CreateVendorPage from "./modules/Vendor/CreateVendorPage";
import EditVendorPage from "./modules/Vendor/EditVendorPage";
import CreateAgencyPage from "./modules/Agency/CreateAgencyPage";
import EditAgencyPage from "./modules/Agency/EditAgencyPage";
import Orderlist from "./modules/Order/OrderList"
import CreateOrderPage from "./modules/Order/CreateOrderPage"
import OrderDetailsPage from "./modules/Order/OrderDetailsPage"
import EditOrderPage from "./modules/Order/EditOrderPage";
// import OrderHistoryPage from './modules/member/OrderHistoryPage'; // File not found, commented out
import MySubscriptionsPage from './modules/member/MySubscriptionsPage'; // Added for member subscriptions
import OrderReceivedPage from "./modules/Order/OrderReceivedPage"; // Added for admin receipt recording
import ProductList from "./modules/Products/ProductList"
import LandingPage from "./modules/Homepage/LandingPage"; // Added for milk subscription landing page
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
          <Route path="/" element={<LandingPage />} />
          <Route path="/products/:id" element={<ProductDetailWrapper />} />
          
          <Route element={<AuthLayout />}>
            <Route path="/admin" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          
        
          </Route>
          <Route element={<MainLayout />}> 
          
            <Route path="/admin/users" element={<UserList />} />
            <Route path="/admin/users/create" element={<UserForm mode='create' />} />
            <Route path="/admin/users/edit/:id" element={<UserForm mode='edit' />} />
            <Route path="/admin/vendors" element={<VendorList />} />
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
            <Route path="/admin/products" element={<ProductList />} />
            <Route path="/admin/products/create" element={<CreateProductPage />} />
            <Route path="/admin/products/edit/:id" element={<EditProductPage />} />
            <Route path="/admin/products/:id" element={<ProductDetailPage />} /> {/* New route for product detail */}
            <Route path="/admin/subscriptions" element={<AdminSubscriptionList />} /> {/* Added for admin subscriptions list */}
            <Route path="/admin/delivery" element={<AgencyDeliveryView />} /> {/* Added for agency delivery management */}

            {/* Vendor specific routes */}
            <Route path="/vendor/orders/:id" element={<OrderDetailsPage />} />
            {/* <Route path="/vendor/orders/:id/record-delivery" element={<OrderDeliveryPage />} /> */}
          
          </Route>
          
          {/* Member specific routes with MemberLayout */}
          <Route element={<MemberLayout />}>
            <Route path="/dashboard" element={<div className="space-y-4">
              <h1 className="text-2xl font-bold">Member Dashboard</h1>
              <p>Welcome to your dashboard. Here you can manage your milk subscription and orders.</p>
              {/* Dashboard content would go here */}
            </div>} />
            <Route path="/member/orders" element={<Orderlist />} />
            <Route path="/member/orders/:id" element={<OrderDetailsPage />} />
            <Route path="/member/products" element={<MemberProductDisplayPage />} /> {/* Member product display page */}
            <Route path="/member/products/:id" element={<ProductDetailPage />} /> {/* New route for member product detail */}
            <Route path="/member/profile" element={<div className="space-y-4">
              <h1 className="text-2xl font-bold">Profile Management</h1>
              <p>Manage your personal information and preferences here.</p>
              {/* Profile management content would go here */}
            </div>} />
            <Route path="/member/addresses" element={<AddressListPage />} />
            <Route path="/member/addresses/create" element={<CreateAddressPage />} />
            <Route path="/member/addresses/edit/:id" element={<EditAddressPage />} />
            <Route path="/member/subscriptions" element={<MySubscriptionsPage />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
};

export default App;
