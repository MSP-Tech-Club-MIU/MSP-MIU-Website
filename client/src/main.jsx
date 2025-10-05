import React from 'react'
import { createRoot } from 'react-dom/client'
import AppRouter from './AppRouter.jsx'
import './assets/CSS/styles.css'

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
)