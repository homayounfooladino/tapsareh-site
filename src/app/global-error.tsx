"use client";

import { useEffect } from "react";
import { reloadOnceForStaleBuild } from "@/lib/reload";

// Last-resort screen when even the root layout fails. Must render its own <html>. Persian only.
export default function GlobalError({ error }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reloadOnceForStaleBuild(error);
  }, [error]);
  return (
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0, fontFamily: "Tahoma, sans-serif", background: "#F6F8F7", color: "#14201B" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>مشکلی پیش آمد</h1>
          <p style={{ margin: 0 }}>صفحه درست باز نشد. چند لحظه‌ی دیگر دوباره امتحان کنید.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ minHeight: 48, padding: "0 20px", borderRadius: 12, border: 0, background: "#0B6B4B", color: "#fff", fontSize: 16, cursor: "pointer" }}
          >
            دوباره امتحان کن
          </button>
        </main>
      </body>
    </html>
  );
}
