import React from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import AppRouter from './AppRouter.jsx'
import { SeasonProvider } from './context/SeasonContext.jsx'
import { ModalProvider } from './context/ModalContext.jsx'
import './assets/CSS/styles.css'

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <SeasonProvider>
        <ModalProvider>
          <AppRouter />
        </ModalProvider>
      </SeasonProvider>
    </HelmetProvider>
  </React.StrictMode>
)

