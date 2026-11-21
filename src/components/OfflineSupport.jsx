"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Pages saved for offline use as soon as a signed-in user opens the app,
// so the till boots with no internet even if it wasn't opened today.
const WARM_PAGES = ["/pos", "/dashboard"];

export default function OfflineSupport() {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // In dev, a caching worker fights hot reload; remove any left from a prod build.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // Scripts this page loaded before the worker was in control.
        const assets = performance
          .getEntriesByType("resource")
          .map((e) => new URL(e.name))
          .filter((u) => u.origin === location.origin)
          .map((u) => u.pathname + u.search);
        reg.active?.postMessage({ type: "WARM", assets, pages: [...new Set([location.pathname, ...WARM_PAGES])] });
      })
      .catch(() => {});
  }, []);

  // Pages reached by client-side navigation never go through the worker as a
  // full page load, so save each one explicitly.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker?.controller?.postMessage({ type: "WARM", pages: [pathname] });
  }, [pathname]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-amber-500 text-white text-xs font-semibold px-4 py-1.5 shadow-lg"
    >
      Offline · showing saved data
    </div>
  );
}

// Called on logout: saved pages hold the signed-in user's data.
export function clearOfflinePages() {
  navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PAGES" });
}
