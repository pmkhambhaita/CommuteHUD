import React from 'react';
import ReactDOM from 'react-dom/client';
import PhoneApp from './phone/PhoneApp';
import AppGlasses from './glass/AppGlasses';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppGlasses />
    <PhoneApp />
  </React.StrictMode>,
);
