import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// In local dev this stays unset — Vite's server.proxy forwards /api requests
// to the local API server instead. In production there's no such proxy, so
// the deployed frontend needs to know the API's real origin.
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL);
}

createRoot(document.getElementById("root")!).render(<App />);

/**
 * Dismiss the index.html skeleton once React has painted.
 *
 * requestAnimationFrame twice: the first callback runs before the paint that
 * follows mounting, the second after it — so the skeleton never lifts on an
 * empty frame. The node is removed after the fade so it can't trap focus or
 * intercept clicks.
 */
const preloader = document.getElementById("preloader");
if (preloader) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      preloader.classList.add("is-hidden");
      preloader.addEventListener("transitionend", () => preloader.remove(), {
        once: true,
      });
      // Fallback: if the transition never fires (reduced motion, backgrounded
      // tab) the loader must still never become a permanent overlay.
      setTimeout(() => preloader.remove(), 1500);
    }),
  );
}
