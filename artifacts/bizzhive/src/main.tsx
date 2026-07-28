import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
