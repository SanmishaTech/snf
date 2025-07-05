import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes"

type ThemeProviderState = {
  theme: string
  setTheme: (theme: string) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)
  const [forcedTheme, setForcedTheme] = useState<string | undefined>(undefined)

  useEffect(() => {
    setMounted(true)
    
    // Check if the device is mobile
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      
      // Check if it's a mobile device using user agent
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      
      // Alternative check using touch capabilities and screen size
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      
      return isMobile || (hasTouchScreen && isSmallScreen)
    }

    // Force light mode on mobile devices
    if (checkMobileDevice()) {
      setForcedTheme("light")
      // Also ensure the document doesn't have dark class
      document.documentElement.classList.remove("dark")
      document.documentElement.classList.add("light")
    }

    // Listen for resize events to detect if device orientation changes
    const handleResize = () => {
      if (checkMobileDevice()) {
        setForcedTheme("light")
        document.documentElement.classList.remove("dark")
        document.documentElement.classList.add("light")
      } else {
        setForcedTheme(undefined)
      }
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <NextThemesProvider
      {...props}
      forcedTheme={forcedTheme}
      defaultTheme="light"
      enableSystem={!forcedTheme}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
