// registerServiceWorker.js — call once from src/index.js
// Registers /service-worker.js in production builds only.
// Edge cases handled:
//  - localhost / `npm start`: skipped entirely, so dev hot-reload keeps working.
//  - Browsers without service worker support (old iOS Safari): silently no-op.
//  - Registration failure: logged, never thrown — the app must still load.

export default function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("Service worker registration failed:", err));
  });
}
