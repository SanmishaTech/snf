import React, { useMemo } from "react";

export interface BannerItem {
  id: string;
  src: string;
  alt: string;
  href?: string;
  title?: string;
}

/**
 * A modern, GPU-accelerated marquee that auto-scrolls horizontally.
 * - Infinite loop using duplicated item track.
 * - Prefers-reduced-motion respected.
 * - Pause on hover.
 * - Touch scroll supported natively; animation resumes after interaction.
 */
export const MarqueeBanner: React.FC<{
  items: BannerItem[];
  height?: number; // px height
  speed?: number; // seconds per full loop
}> = ({ items, height = 120, speed = 25 }) => {
  const track = useMemo(() => [...items, ...items], [items]); // duplicate for infinite scroll

  return (
    <section
      className="relative w-full bg-background border-y"
      aria-label="Promotional banner"
    >
      <div
        className="relative overflow-hidden group"
        style={{
          // Provide stable height to avoid CLS
          height,
        }}
      >
        {/* Gradient masks for modern look */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-background to-transparent z-10" />

        <ul
          className="flex items-stretch gap-4 will-change-transform [animation:snf-marquee_linear_infinite] motion-reduce:animate-none group-hover:[animation-play-state:paused]"
          style={
            {
              "--snf-marquee-speed": `${speed}s`,
            } as React.CSSProperties
          }
          aria-live="polite"
        >
          {track.map((item, idx) => {
            const key = `${item.id}-${idx}`;
            const content = (
              <picture className="h-full w-auto block">
                <img
                  src={item.src}
                  alt={item.alt}
                  height={height}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-auto object-cover rounded-md shadow-sm transition-transform duration-300 hover:scale-[1.02]"
                />
              </picture>
            );
            return (
              <li
                key={key}
                className="flex items-center h-full shrink-0"
                style={{ minWidth: height * 2.2 }} // reasonable banner width ratio
              >
                {item.href ? (
                  <a
                    href={item.href}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                    aria-label={item.title || item.alt}
                  >
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Local styles for marquee animation */}
      <style>
        {`
        @keyframes snf-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .[animation\\:snf-marquee_linear_infinite] {
          animation: snf-marquee var(--snf-marquee-speed, 25s) linear infinite;
        }
      `}
      </style>
    </section>
  );
};