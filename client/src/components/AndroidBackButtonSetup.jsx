import { useAndroidBackButton } from '../hooks/useAndroidBackButton';

/**
 * Component to setup Android back button handling
 * Must be rendered inside Router context
 */
const AndroidBackButtonSetup = () => {
  // Setup Android back button handling
  useAndroidBackButton({
    exitOnHome: true,
    homePath: '/'
  });

  return null; // This component doesn't render anything
};

export default AndroidBackButtonSetup;

