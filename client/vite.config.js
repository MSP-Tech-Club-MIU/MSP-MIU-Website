import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'static',
  build: {
    outDir: 'public',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-animation';
            }
            if (id.includes('react-icons')) {
              return 'vendor-icons';
            }
            if (id.includes('axios')) {
              return 'vendor-utils';
            }
            // Group other node_modules
            return 'vendor-misc';
          }
          
          // Component chunks for better code splitting
          if (id.includes('/components/Dashboard')) {
            return 'chunk-dashboard';
          }
          if (id.includes('/pages/Home/')) {
            return 'chunk-home-sections';
          }
          if (id.includes('/pages/AboutUs')) {
            return 'chunk-about';
          }
          if (id.includes('/components/TextType')) {
            return 'chunk-texttype';
          }
        }
      }
    },
    // Enable source maps for production debugging
    sourcemap: false,
    // Optimize bundle size - using esbuild (built into Vite, no extra dependency needed)
    minify: 'esbuild',
    // Set chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'react-icons', 'axios']
  },
  // Enable gzip compression
  server: {
    compress: true
  }
})


