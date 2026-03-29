import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ResultProvider } from './context/ResultContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ResultProvider>
      <App />
    </ResultProvider>
  </React.StrictMode>,
);
