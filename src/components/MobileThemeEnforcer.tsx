import { useMobileTheme } from '../hooks/useMobileTheme';

/**
 * Component that enforces light mode on mobile devices
 * Should be placed at the root level of the app
 */
export const MobileThemeEnforcer = () => {
  // This hook will handle all the mobile theme logic
  useMobileTheme();
  
  // This component doesn't render anything
  return null;
};
