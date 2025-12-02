import React, { memo } from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import { FiDownload, FiSmartphone, FiShield, FiZap, FiCheck } from 'react-icons/fi';
import { FaAndroid } from 'react-icons/fa';
import './DownloadAndroidApp.css';

const DownloadAndroidApp = memo(() => {
  console.log('[DownloadAndroidApp] Component rendered');
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "MSP - MIU Android App",
    "applicationCategory": "MobileApplication",
    "operatingSystem": "Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  const features = [
    {
      icon: <FiZap />,
      title: "Fast & Responsive",
      description: "Optimized performance for smooth user experience"
    },
    {
      icon: <FiShield />,
      title: "Secure",
      description: "Your data is protected with industry-standard security"
    },
    {
      icon: <FiSmartphone />,
      title: "Native Experience",
      description: "Full-featured mobile app built with Capacitor"
    }
  ];

  const handleDownload = () => {
    // Get the R2 public domain from environment variables
    // In Vite, environment variables must be prefixed with VITE_ to be accessible in client code
    let r2Domain = import.meta.env.VITE_R2_PUBLIC_DOMAIN || import.meta.env.R2_PUBLIC_DOMAIN;
    
    if (!r2Domain) {
      console.error('R2_PUBLIC_DOMAIN environment variable is not set');
      alert('Download URL is not configured. Please contact the administrator.');
      return;
    }
    
    // Clean up the domain (remove any leading = or whitespace)
    r2Domain = r2Domain.trim().replace(/^=+/, '');
    
    // Ensure the domain has a protocol
    if (!r2Domain.startsWith('http://') && !r2Domain.startsWith('https://')) {
      r2Domain = `https://${r2Domain}`;
    }
    
    // Remove trailing slash if present
    r2Domain = r2Domain.replace(/\/+$/, '');
    
    // Construct the APK URL with proper encoding
    const apkPath = '/Mobile Application/MSP-MIU.apk';
    const apkUrl = `${r2Domain}${encodeURI(apkPath)}`;
    
    console.log('[Download] APK URL:', apkUrl);
    window.open(apkUrl, '_blank');
  };

  console.log('[DownloadAndroidApp] Rendering JSX');
  
  return (
    <main className="DownloadAndroidApp">
      <BackButton to="/" label="Back to Home" />
      <SEO
        title="Download Android App"
        description="Download the MSP - MIU Android app for the best mobile experience. Access events, latest activities, accounts, and more on your Android device."
        keywords="MSP MIU Android app, download APK, mobile app, Android application"
        url="https://msp-miu.tech/download-android"
        structuredData={structuredData}
      />
      
      <section className="DownloadHero">
        <div className="DownloadHero__bg" aria-hidden="true" />
        <motion.div 
          className="DownloadHero__inner"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="DownloadHero__icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <FaAndroid />
          </motion.div>
          <h1 className="DownloadHero__title">Download Android App</h1>
          <p className="DownloadHero__subtitle">
            Get the MSP - MIU app on your Android device for the best mobile experience
          </p>
        </motion.div>
      </section>

      <section className="DownloadContent">
        <div className="DownloadContent__container">
          <motion.div 
            className="DownloadCard"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="DownloadCard__header">
              <h2>MSP - MIU Mobile App</h2>
              <p className="DownloadCard__version">Version 1.0.0</p>
            </div>
            
            <div className="DownloadCard__body">
              <p className="DownloadCard__description">
                Experience MSP Tech Club on the go with our native Android app. 
                Access events, view board members, check leaderboards, and stay connected 
                with the community wherever you are.
              </p>

              <motion.button
                className="DownloadButton"
                onClick={handleDownload}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiDownload className="DownloadButton__icon" />
                <span>Download APK</span>
              </motion.button>

              <div className="DownloadCard__info">
                <p className="DownloadCard__info-text">
                  <FiCheck className="DownloadCard__info-icon" />
                  Compatible with Android 5.0 and above
                </p>
                <p className="DownloadCard__info-text">
                  <FiCheck className="DownloadCard__info-icon" />
                  File size: ~35 MB
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="FeaturesGrid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <h3 className="FeaturesGrid__title">App Features</h3>
            <div className="FeaturesGrid__container">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="FeatureCard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="FeatureCard__icon">{feature.icon}</div>
                  <h4 className="FeatureCard__title">{feature.title}</h4>
                  <p className="FeatureCard__description">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            className="InstallInstructions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <h3 className="InstallInstructions__title">Installation Instructions</h3>
            <ol className="InstallInstructions__list">
              <li>Download the APK file using the button above</li>
              <li>Open the downloaded file on your Android device</li>
              <li>If prompted, allow installation from unknown sources in your device settings</li>
              <li>Follow the on-screen instructions to complete installation</li>
              <li>Launch the app and enjoy!</li>
            </ol>
          </motion.div>
        </div>
      </section>
    </main>
  );
});

DownloadAndroidApp.displayName = 'DownloadAndroidApp';

export default DownloadAndroidApp;


