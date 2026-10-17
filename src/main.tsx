import React from 'react';
import ReactDOM from 'react-dom/client';
// CSS global primeiro: o CSS importado pelos componentes (obra-etapas-arquivos, decisoes-diario,
// registros-modelos) precisa carregar depois dele para vencer empates de especificidade.
import './index.css';
import './styles/foundation.css';
import './styles/home-auth.css';
import { App } from './App';
import { initModalBackdropGuard } from './utils/modalBackdropGuard';
import { initSheetFocusGuard } from './utils/sheetFocus';
import { initBodyScrollLock } from './utils/bodyScrollLock';

initModalBackdropGuard();
initSheetFocusGuard();
initBodyScrollLock();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
