// Builds the clickable demo: the real page (built with DEMO_BUILD=1) plus dev/demo-shim.js,
// which answers /api/* inside the browser. Output: ../tapsareh-site-demo/
//   DEMO_BUILD=1 npx next build && node dev/make-demo.mjs
import { cp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";

const OUT = new URL("../out/", import.meta.url);
const DEST = new URL("../../tapsareh-site-demo/", import.meta.url);

const STRIP_CSS = `<style>
html::before{content:"نسخهٔ نمایشی؛ پاسخ‌ها ساختگی است · کد پیامک: ۱۲۳۴۵۶ · کد دعوت: TEST-CODE · برای شروع از نو، زبانه را ببندید";
position:fixed;top:0;right:0;left:0;z-index:70;height:30px;line-height:30px;text-align:center;background:#7A4B05;color:#fff;
font:13px Tahoma,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 8px}
html body{padding-top:30px}html body .app{height:calc(100dvh - 30px)}html body .overlay{top:30px}
@media (max-width:820px){html body .side{top:30px}html::before{content:"نمایشی، پاسخ ساختگی · کد پیامک ۱۲۳۴۵۶ · دعوت TEST-CODE";font-size:12px}}
</style>`;

await rm(DEST, { recursive: true, force: true });
await cp(OUT, DEST, { recursive: true });
await cp(new URL("./demo-shim.js", import.meta.url), new URL("./demo-shim.js", DEST));
for (const page of ["index.html", "404.html"]) {
  const url = new URL(page, DEST);
  const html = await readFile(url, "utf8");
  if (!html.includes('href="./_next/')) throw new Error(`${page}: not a demo build (paths are not relative)`);
  await writeFile(url, html.replace("<head>", `<head><script src="./demo-shim.js"></script>${STRIP_CSS}`));
}
// The artifact host reserves names that start with «_»: move _next/ to nx/ and fix every reference.
const fix = (t) => t.replace(/(?<![_\w])_next\//g, "nx/");
await rename(new URL("./_next", DEST), new URL("./nx", DEST));
for (const page of ["index.html", "404.html"]) {
  const url = new URL(page, DEST);
  await writeFile(url, fix(await readFile(url, "utf8")));
}
const chunks = new URL("./nx/static/chunks/", DEST);
// The artifact host only allows fonts from data: URIs, so inline the three Vazirmatn files into the stylesheet.
for (const f of await readdir(chunks)) {
  if (!f.endsWith(".css")) continue;
  const url = new URL(f, chunks);
  let css = await readFile(url, "utf8");
  for (const m of [...css.matchAll(/url\(\.\.\/media\/([^)]+\.woff2)\)/g)]) {
    const b64 = (await readFile(new URL(`../media/${m[1]}`, chunks))).toString("base64");
    css = css.replace(m[0], `url(data:font/woff2;base64,${b64})`);
  }
  await writeFile(url, css);
}
for (const f of await readdir(chunks)) {
  if (!f.endsWith(".js") && !f.endsWith(".css")) continue;
  const url = new URL(f, chunks);
  const t = await readFile(url, "utf8");
  if (fix(t) !== t) await writeFile(url, fix(t));
}
console.log("demo ready:", DEST.pathname);
