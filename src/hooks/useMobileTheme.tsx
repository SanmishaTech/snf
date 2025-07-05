import { useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

/**
 * Custom hook to detect mobile devices and force light mode
 */
export const useMobileTheme = () => {
  const { setTheme, theme, resolvedTheme } = useNextTheme();

  useEffect(() => {
    const checkAndSetMobileTheme = () => {
      // Multiple methods to detect mobile devices
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      
      // Check user agent for mobile devices
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      
      // Check for touch capabilities
      const hasTouchScreen = 'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        (navigator as any).msMaxTouchPoints > 0;
      
      // Check screen size
      const isSmallScreen = window.innerWidth <= 768;
      
      // Check for mobile-specific features
      const isMobileDevice = window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(hover: none)').matches;
      
      // Combine all checks
      const isMobile = isMobileUserAgent || (hasTouchScreen && isSmallScreen) || isMobileDevice;

      if (isMobile) {
        // Force light mode on mobile
        setTheme('light');
        
        // Ensure the DOM reflects the change immediately
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        
        // Override any system preferences
        document.documentElement.style.colorScheme = 'light';
        
        // Prevent any dark mode styles from being applied
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', '#ffffff');
        } else {
          const meta = document.createElement('meta');
          meta.name = 'theme-color';
          meta.content = '#ffffff';
          document.head.appendChild(meta);
        }
      }
    };

    // Run immediately
    checkAndSetMobileTheme();

    // Run on resize to catch orientation changes
    window.addEventListener('resize', checkAndSetMobileTheme);
    window.addEventListener('orientationchange', checkAndSetMobileTheme);

    // Observe for any class changes that might try to add dark mode
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const element = mutation.target as HTMLElement;
          if (element === document.documentElement && element.classList.contains('dark')) {
            checkAndSetMobileTheme();
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      window.removeEventListener('resize', checkAndSetMobileTheme);
      window.removeEventListener('orientationchange', checkAndSetMobileTheme);
      observer.disconnect();
    };
  }, [setTheme]);

  return { theme, resolvedTheme };
};
