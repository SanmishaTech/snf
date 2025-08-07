import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-10">
          <div className="md:col-span-12 lg:col-span-4">
            <div className="mb-6 flex items-center">
              <span className="inline-grid place-items-center h-10 w-10 rounded bg-primary text-primary-foreground mr-3 font-bold">
                S
              </span>
              <span className="text-xl font-bold">SNF Market</span>
            </div>
            <p className="text-sm mb-6 leading-relaxed">
              Fresh groceries delivered fast. Pure, natural, and carefully curated selection.
            </p>
            <h3 className="text-[0.9rem] font-semibold mb-3 text-gray-600 dark:text-gray-400">
              Payment Accepted
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              {["Mastercard", "Discover", "UPI", "Visa", "Stripe"].map((method) => (
                <span
                  key={method}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md shadow-sm"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-1" />

          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-md font-semibold mb-4 border-b-2 border-primary pb-1 inline-block">
              Policies
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</a></li>
              <li><a href="/shipping-policy" className="hover:text-primary transition-colors">Shipping Policy</a></li>
              <li><a href="/terms-and-conditions" className="hover:text-primary transition-colors">Terms & Conditions</a></li>
            </ul>
          </div>

          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-md font-semibold mb-4 border-b-2 border-primary pb-1 inline-block">
              Useful Links
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/snf" className="hover:text-primary transition-colors">Home</a></li>
              <li><a href="/snf#products" className="hover:text-primary transition-colors">Products</a></li>
              <li><a href="/about" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          <div className="md:col-span-4 lg:col-span-3">
            <h3 className="text-md font-semibold mb-4 border-b-2 border-primary pb-1 inline-block">
              Contact
            </h3>
            <address className="text-sm not-italic space-y-2 leading-relaxed">
              <p>SNF Market, Fresh Street, Farm District, 421201</p>
              <p>
                <a href="mailto:hello@snf.example" className="hover:text-primary transition-colors break-all">
                  hello@snf.example
                </a>
              </p>
              <p>
                <a href="tel:+910000000000" className="hover:text-primary transition-colors">
                  +91 0000000000
                </a>
              </p>
            </address>
          </div>
        </div>
      </div>

      <div className="bg-gray-200 dark:bg-gray-800 py-4 border-t border-gray-300 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 dark:text-gray-400">
          <p className="mb-2 md:mb-0 text-center md:text-left">
            &copy; {new Date().getFullYear()} SNF Market. All Rights Reserved.
          </p>
          <p className="text-center md:text-right">
            Built with love and veggies.
          </p>
        </div>
      </div>
    </footer>
  );
};