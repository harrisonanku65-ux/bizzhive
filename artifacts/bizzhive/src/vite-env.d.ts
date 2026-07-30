/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the deployed API server (e.g. https://bizzhive.onrender.com). Unset in local dev — the Vite proxy handles /api requests instead. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
