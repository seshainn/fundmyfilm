import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initAuth } from "@/components/initAuth";

(async () => {
  await initAuth();

  createRoot(document.getElementById("root")!).render(
      <App />
  );
})();