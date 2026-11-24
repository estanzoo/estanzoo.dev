import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The production build prerenders the page into #root; in `vite dev` it only
// holds the <!--app--> marker comment, so render from scratch instead.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
