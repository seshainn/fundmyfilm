import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAuth } from "@/components/initAuth.ts";

(async () => {
  await initAuth();

  createRoot(document.getElementById("root")!).render(
    <App />
  );
})();