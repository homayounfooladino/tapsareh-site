"use client";

import { Logo } from "@/components/Icon";

// Replaces Next's default English error screen inside the page.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="app" style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="dialog" style={{ boxShadow: "none", alignItems: "center", textAlign: "center" }}>
        <Logo size={56} />
        <h1 style={{ margin: 0, fontSize: 22 }}>مشکلی پیش آمد</h1>
        <p style={{ margin: 0, color: "var(--text2)" }}>صفحه درست باز نشد. دوباره امتحان کنید.</p>
        <button type="button" className="btn" onClick={() => reset()}>
          دوباره امتحان کن
        </button>
      </div>
    </main>
  );
}
