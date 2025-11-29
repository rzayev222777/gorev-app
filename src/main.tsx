import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // First, unregister ALL existing service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`Found ${registrations.length} existing service workers`);

    for (const registration of registrations) {
      await registration.unregister();
      console.log('Unregistered:', registration.scope);
    }

    // Wait a bit then register fresh
    setTimeout(() => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Fresh SW registered:', registration);
        })
        .catch(error => {
          console.error('❌ SW registration failed:', error);
        });
    }, 1000);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
