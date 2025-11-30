import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Service worker registration is handled in src/utils/notifications.ts
// We only use firebase-messaging-sw.js to avoid duplicate notifications

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
