"use client";

import { useEffect } from "react";

/** Đăng ký Service Worker (chỉ ở production) để app cài được và có trang ngoại tuyến. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Đăng ký thất bại không ảnh hưởng chức năng chính của ứng dụng.
    });
  }, []);

  return null;
}
