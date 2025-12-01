import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// Plugin to transform manifest.json with R2 domain
function manifestPlugin() {
  const getFaviconUrl = () => {
    const r2Domain = process.env.VITE_R2_PUBLIC_DOMAIN || ''
    const faviconPath = '/Assets/msp-logo-favicon.png'
    return r2Domain ? `${r2Domain.replace(/\/+$/, '')}${faviconPath}` : '/assets/msp-logo-favicon.png'
  }
  
  const transformManifest = (manifest) => {
    const faviconUrl = getFaviconUrl()
    
    // Update all icon srcs
    const updateIcons = (icons) => {
      if (Array.isArray(icons)) {
        icons.forEach(icon => {
          if (icon.src && icon.src.includes('msp-logo-favicon.png')) {
            icon.src = faviconUrl
          }
        })
      }
    }
    
    updateIcons(manifest.icons)
    if (manifest.shortcuts) {
      manifest.shortcuts.forEach(shortcut => {
        if (shortcut.icons) {
          updateIcons(shortcut.icons)
        }
      })
    }
    
    return manifest
  }
  
  return {
    name: 'manifest-transform',
    transformIndexHtml(html) {
      // Inject R2 domain into HTML for favicon script
      const r2Domain = process.env.VITE_R2_PUBLIC_DOMAIN || ''
      return html.replace('__R2_PUBLIC_DOMAIN__', JSON.stringify(r2Domain))
    },
    configureServer(server) {
      // Transform manifest.json for dev server
      server.middlewares.use('/manifest.json', (req, res, next) => {
        try {
          const manifestPath = join(__dirname, 'static', 'manifest.json')
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
          const transformed = transformManifest(manifest)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(transformed, null, 2))
        } catch (error) {
          next()
        }
      })
    },
    writeBundle() {
      // Transform manifest.json after build
      const outputManifestPath = join(__dirname, 'public', 'manifest.json')
      try {
        const manifest = JSON.parse(readFileSync(outputManifestPath, 'utf-8'))
        const transformed = transformManifest(manifest)
        writeFileSync(outputManifestPath, JSON.stringify(transformed, null, 2))
      } catch (error) {
        console.warn('Could not transform manifest.json:', error.message)
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), manifestPlugin()],
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
        },
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/pdf|pptx?|docx?|xlsx?/i.test(ext)) {
            return `assets/documents/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
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
  },
  // Asset handling for static files (images, documents, etc.)
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp', '**/*.pdf', '**/*.pptx', '**/*.ppt']
})


