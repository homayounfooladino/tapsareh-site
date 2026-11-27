import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Vazirmatn from the same files the live page uses (OFL, see src/fonts/OFL.txt). Nothing is fetched from outside.
const vazir = localFont({
  src: [
    { path: "../fonts/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Vazirmatn-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  title: "تپصره",
  description: "دستیار قوانین و مقررات مالیاتی، بر پایه‌ی متن جاری قانون",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#141615" },
  ],
};

// Sets light/dark before the first paint so the page does not flash. Storage may be blocked; then the system setting wins.
const themeInit = `try{var t=localStorage.getItem("tp-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`;

// A page kept from an older build may ask for build files a newer install no longer has. Then reload once (the page itself
// is always re-checked by the server, so the reload brings the current build). Once per tab, so it never loops; App clears
// the mark after a good start. Inline, because it must work even when the build files themselves fail to load.
const staleBuild = `addEventListener("error",function(e){var t=e.target,u=t&&(t.src||t.href)||"";if(!t||(t.tagName!=="SCRIPT"&&t.tagName!=="LINK")||u.indexOf("/_next/static/")<0)return;try{if(sessionStorage.getItem("tp-reloaded"))return;sessionStorage.setItem("tp-reloaded","1")}catch(_){return}location.reload()},true);`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: staleBuild }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
