import Link from "next/link";
import { Logo } from "@/components/Icon";

// Replaces Next's default English 404 page.
export default function NotFound() {
  return (
    <main className="app" style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="dialog" style={{ boxShadow: "none", alignItems: "center", textAlign: "center" }}>
        <Logo size={56} />
        <h1 style={{ margin: 0, fontSize: 22 }}>این صفحه پیدا نشد</h1>
        <p style={{ margin: 0, color: "var(--text2)" }}>نشانی را بررسی کنید یا به صفحه‌ی اصلی تپصره برگردید.</p>
        <Link className="btn" href="/">
          برگشت به تپصره
        </Link>
      </div>
    </main>
  );
}
