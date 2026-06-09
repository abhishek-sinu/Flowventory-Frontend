import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PwaInstall from './PwaInstall';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <PwaInstall />
  </React.StrictMode>
);

// Register the service worker so the app is installable and works offline.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      /* Registration failures are non-fatal; the app still works online. */
    });
  });
}
