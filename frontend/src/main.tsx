import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SzerepProvider } from './context/SzerepContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SzerepProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
      </SzerepProvider>
    </BrowserRouter>
  </StrictMode>,
);
