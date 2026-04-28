import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const redirectPath = sessionStorage.getItem('solseven.redirect');
if (redirectPath) {
  sessionStorage.removeItem('solseven.redirect');
  window.history.replaceState({}, '', redirectPath);
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
