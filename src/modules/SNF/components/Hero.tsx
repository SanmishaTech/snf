import React from "react";

export const Hero: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 text-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Fresh groceries, delivered to your door
            </h1>
            <p className="mt-4 text-white/90 text-base md:text-lg">
              Handpicked fruits, crisp vegetables, dairy, and daily essentials. Fast delivery,
              great prices, and quality you can trust.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#products"
                className="inline-flex items-center justify-center rounded-md bg-white text-green-700 font-medium h-10 px-6 shadow hover:shadow-md transition"
                aria-label="Shop now"
              >
                Shop now
              </a>
              <a
                href="#deals"
                className="inline-flex items-center justify-center rounded-md border border-white/80 text-white font-medium h-10 px-6 hover:bg-white/10 transition"
                aria-label="View deals"
              >
                View deals
              </a>
            </div>
          </div>
          <div className="relative">
            <picture>
              <source
                media="(min-width: 1024px)"
                srcSet="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop"
              />
              <source
                media="(min-width: 640px)"
                srcSet="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=900&auto=format&fit=crop"
              />
              <img
                className="w-full h-60 sm:h-72 md:h-80 lg:h-96 object-cover rounded-lg shadow-lg"
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=640&auto=format&fit=crop"
                alt="Fresh produce assortment including fruits and vegetables"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <div className="absolute -bottom-4 -right-4 bg-white/90 text-green-700 px-4 py-2 rounded shadow md:text-lg font-semibold">
              Up to 30% off today
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};