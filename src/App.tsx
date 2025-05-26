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
import OrderDeliveryPage from "./modules/Order/OrderDeliveryPage"; // Added for vendor delivery recording
import ProductList from "./modules/Products/ProductList"
import CreateProductPage from "./modules/Products/CreateProductPage";
import EditProductPage from "./modules/Products/EditProductPage";
import { Toaster } from "sonner";
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
          <Route element={<AuthLayout />}>
            <Route path="/" element={<Login />} />
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
            <Route path="/admin/orders/edit/:id" element={<EditOrderPage />} />
            <Route path="/admin/products" element={<ProductList />} />
            <Route path="/admin/products/create" element={<CreateProductPage />} />
            <Route path="/admin/products/edit/:id" element={<EditProductPage />} />

            {/* Vendor specific routes */}
            <Route path="/vendor/orders/:id" element={<OrderDetailsPage />} />
            <Route path="/vendor/orders/:id/record-delivery" element={<OrderDeliveryPage />} />
           </Route>  
        </Routes>
      </Router>
    </>
  );
};

export default App;
