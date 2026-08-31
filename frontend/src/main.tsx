import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import axios from 'axios';

// In production, use the absolute URL provided by Vercel environment variables.
// In local development, fall back to empty string to use the Vite proxy.
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
