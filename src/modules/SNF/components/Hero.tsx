import React from "react";

export const Hero: React.FC = () => {
  const slides = [
    {
      title: "Fresh groceries, delivered to your door",
      description:
        "Handpicked fruits, crisp vegetables, dairy, and daily essentials. Fast delivery, great prices, and quality you can trust.",
      primaryLabel: "Shop now",
      primaryHref: "#products",
      secondaryLabel: "View deals",
      secondaryHref: "#deals",
      image:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop",
      alt: "Fresh produce assortment including fruits and vegetables",
      badge: "Up to 30% off today",
    },
    {
      title: "Daily essentials, right when you need them",
      description:
        "Milk, bread, eggs, snacks, and more — delivered fast with freshness guaranteed.",
      primaryLabel: "Browse essentials",
      primaryHref: "#essentials",
      secondaryLabel: "Today’s offers",
      secondaryHref: "#offers",
      image:
        "https://images.unsplash.com/photo-1506806732259-39c2d0268443?q=80&w=1200&auto=format&fit=crop",
      alt: "Assorted vegetables and herbs on a table",
      badge: "Fresh arrivals daily",
      imageOnly: true,
    },
    {
      title: "Quality you can trust",
      description:
        "Locally sourced produce and top brands — curated for your kitchen.",
      primaryLabel: "Explore categories",
      primaryHref: "#categories",
      secondaryLabel: "Best sellers",
      secondaryHref: "#bestsellers",
      image:
        "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?q=80&w=1200&auto=format&fit=crop",
      alt: "Grocery basket with assorted products",
      badge: "Top picks this week",
      imageOnly: true,
    },
  ];

  const [current, setCurrent] = React.useState(0);
  const intervalRef = React.useRef<number | null>(null);

  const stop = () => {
    if (typeof window !== "undefined" && intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    if (typeof window === "undefined") return;
    stop();
    intervalRef.current = window.setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
  };

  React.useEffect(() => {
    start();
    return stop;
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent((c) => (c + 1) % slides.length);

  return (
    <section className="relative bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 text-white">
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] p-0">
        <div
          className="relative overflow-hidden h-[22rem] sm:h-[26rem] md:h-[30rem] lg:h-[36rem] group"
          onMouseEnter={stop}
          onMouseLeave={start}
          role="region"
          aria-roledescription="carousel"
          aria-label="Hero promotions"
        >
          {slides.map((s, idx) => (
            <div
              key={s.title}
              className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${idx === current ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 pointer-events-none'}`}
              aria-hidden={idx !== current}
            >
              {s.imageOnly ? (
                <img
                  className="w-full h-full object-cover"
                  src={s.image}
                  alt={s.alt}
                  loading={idx === current ? 'eager' : 'lazy'}
                  decoding="async"
                />
              ) : (
                <div className="p-4 grid md:grid-cols-2 gap-8 items-center h-full">
                  <div>
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">{s.title}</h1>
                    <p className="mt-4 text-white/90 text-base md:text-lg">{s.description}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <a
                        href={s.primaryHref}
                        className="inline-flex items-center justify-center rounded-md bg-white text-green-700 font-medium h-10 px-6 shadow hover:shadow-md transition"
                        aria-label={s.primaryLabel}
                      >
                        {s.primaryLabel}
                      </a>
                      <a
                        href={s.secondaryHref}
                        className="inline-flex items-center justify-center rounded-md border border-white/80 text-white font-medium h-10 px-6 hover:bg-white/10 transition"
                        aria-label={s.secondaryLabel}
                      >
                        {s.secondaryLabel}
                      </a>
                    </div>
                  </div>
                  <div className="relative h-full">
                    <img
                      className="w-full h-full max-w-2xl max-h-2xl object-cover rounded-lg shadow-lg"
                      src={s.image}
                      alt={s.alt}
                      loading={idx === current ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                    <div className="absolute -bottom-4 -right-4 bg-white/90 text-green-700 px-4 py-2 rounded shadow md:text-lg font-semibold">
                      {s.badge}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            aria-label="Previous slide"
            onClick={prev}
            className="hidden sm:flex absolute inset-y-0 left-2 z-10 items-center justify-center w-10 text-white/90 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={next}
            className="hidden sm:flex absolute inset-y-0 right-2 z-10 items-center justify-center w-10 text-white/90 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                aria-current={i === current}
                className={`h-2.5 w-2.5 rounded-full transition-all ${i === current ? 'bg-white' : 'bg-white/50 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};