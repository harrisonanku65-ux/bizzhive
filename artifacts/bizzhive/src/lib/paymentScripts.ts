/**
 * On-demand loaders for the Paystack and Flutterwave checkout SDKs.
 *
 * These used to be <script defer> tags in index.html, which meant every
 * visitor downloaded and executed both on every page — including people just
 * browsing courses. Flutterwave's v3.js also throws an uncaught
 * "Cannot read properties of null (reading 'removeChild')" during its own
 * init, which Vite's error overlay surfaces as an "unknown runtime error"
 * even though nothing in this app is at fault.
 *
 * Loading them only when the checkout modal actually needs one removes both
 * problems: no third-party JS on ordinary page views, and no stray overlay.
 *
 * Each loader caches its promise, so repeated opens reuse the same script tag.
 */

const PAYSTACK_SRC = "https://js.paystack.co/v1/inline.js";
const FLUTTERWAVE_SRC = "https://checkout.flutterwave.com/v3.js";

const cache = new Map<string, Promise<boolean>>();

function loadScript(src: string): Promise<boolean> {
  const existing = cache.get(src);
  if (existing) return existing;

  const promise = new Promise<boolean>((resolve) => {
    // Already present (e.g. hot reload) — nothing to do.
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => resolve(true);

    // Resolve false rather than rejecting: a missing SDK is not fatal. The
    // checkout falls back to the provider's hosted redirect page.
    script.onerror = () => resolve(false);

    // Don't hang the UI forever on a stalled network.
    setTimeout(() => resolve(false), 8000);

    document.head.appendChild(script);
  });

  cache.set(src, promise);
  return promise;
}

export function loadPaystack(): Promise<boolean> {
  if (typeof window !== "undefined" && (window as any).PaystackPop) {
    return Promise.resolve(true);
  }
  return loadScript(PAYSTACK_SRC);
}

export function loadFlutterwave(): Promise<boolean> {
  if (typeof window !== "undefined" && (window as any).FlutterwaveCheckout) {
    return Promise.resolve(true);
  }
  return loadScript(FLUTTERWAVE_SRC);
}
