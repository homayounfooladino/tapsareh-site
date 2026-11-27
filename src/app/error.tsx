"use client";

import { useEffect } from "react";
import { Logo } from "@/components/Icon";
import { reloadOnceForStaleBuild } from "@/lib/reload";

// Replaces Next's default English error screen inside the page.
export default function ErrorPage({ error }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reloadOnceForStaleBuild(error);
  }, [error]);
  return (
    <main className="app" style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="dialog" style={{ boxShadow: "none", alignItems: "center", textAlign: "center" }}>
        <Logo size={56} />
        <h1 style={{ margin: 0, fontSize: 22 }}>مشکلی پیش آمد</h1>
        <p style={{ margin: 0, color: "var(--text2)" }}>صفحه درست باز نشد؛ یک بار دیگر امتحان کنید.</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          دوباره امتحان کن
        </button>
      </div>
    </main>
  );
}
