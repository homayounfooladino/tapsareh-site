// Fake Tapsareh server for building and testing the page without Spark.
// Serves ./out and imitates /api/* as described in API_CONTRACT.md. No real model, no real SMS.
//
//   node dev/mock-server.mjs                 → new server (guest, SMS, usage, chat list)
//   MOCK_LEGACY=1 node dev/mock-server.mjs   → behaves like today's live server (invite only)
//   MOCK_BUSY=1 …                            → every question gets the «busy» answer
//
// Test values: invite code TEST-CODE · SMS code 123456 · guest budget 3 questions.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.PORT || 8698);
const LEGACY = process.env.MOCK_LEGACY === "1";
const BUSY = process.env.MOCK_BUSY === "1";
const FAST = process.env.MOCK_FAST === "1";
const ROOT = new URL("../out/", import.meta.url).pathname;

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".json": "application/json" };

// ── state ────────────────────────────────────────────────────────────────
const accounts = new Map(); // id → {id, kind, name, mobile, used, budget}
const tokens = new Map(); // cookie → account id
const sessions = new Map(); // sid → {sid, owner, title, updated, turns: []}
const smsCodes = new Map(); // mobile → {code, name}
let turnSeq = 1000;
const GUEST_BUDGET = 3 * 6000;
const DAILY = { sms: 150000, invite: 300000 };
const PER_Q = 6000;

const id = () => randomBytes(9).toString("base64url");
function newAccount(kind, extra = {}) {
  const a = { id: id(), kind, name: "", mobile: "", used: 0, budget: kind === "guest" ? GUEST_BUDGET : DAILY[kind], ...extra };
  accounts.set(a.id, a);
  return a;
}
const usage = (a) => ({ pct: Math.min(100, Math.round((100 * a.used) / a.budget)), resets_at: "00:00", exhausted: a.used >= a.budget });
function view(a, sid) {
  const out = { name: a.name || undefined, remaining_today: Math.max(0, Math.floor((a.budget - a.used) / PER_Q)), turn_in_session: sid ? sessions.get(sid)?.turns.length || 0 : 0, data_updated: "۱۴۰۵/۰۸/۲۷" };
  if (!LEGACY) Object.assign(out, { account: a.kind, mobile: a.mobile || undefined, usage: usage(a) });
  if (sid) out.session_id = sid;
  return out;
}
function cookieOf(req) {
  const m = /(?:^|;\s*)trial_auth=([^;]+)/.exec(req.headers.cookie || "");
  return m ? accounts.get(tokens.get(m[1])) : undefined;
}
function stamp(res, a) {
  const t = id();
  tokens.set(t, a.id);
  res.setHeader("Set-Cookie", `trial_auth=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
}
function newSession(owner) {
  const s = { sid: id(), owner: owner.id, title: "", updated: new Date().toISOString(), turns: [] };
  sessions.set(s.sid, s);
  return s;
}
function json(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}
async function body(req) {
  let raw = "";
  for await (const c of req) raw += c;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, FAST ? Math.min(ms, 20) : ms));

const ANSWER = `خلاصه: تا چهار ماه پس از پایان سال مالی؛ برای شرکتی که سال مالی‌اش پایان اسفند است، تا **پایان تیر**.

طبق ماده ۱۱۰ قانون مالیات‌های مستقیم، اشخاص حقوقی باید اظهارنامه، ترازنامه و حساب سود و زیان را در این مهلت بدهند:
- اگر سال مالی با سال شمسی یکی نیست، چهار ماه از پایان همان سال مالی شمرده می‌شود.
- تسلیم دیرهنگام جریمه دارد (ماده ۱۹۲).

1. اظهارنامه را در سامانه پر کنید.
2. پیوست‌ها را بارگذاری کنید.`;

const SOURCES = [
  { n: 1, title: "ماده ۱۱۰", doc_title: "قانون مالیات‌های مستقیم", status: "جاری", text: "اشخاص حقوقی مکلف‌اند اظهارنامه و ترازنامه و حساب سود و زیان را حداکثر تا چهار ماه پس از سال مالی تسلیم کنند…", validity_lines: ["اعتبار از 1394/04/31 تا امروز"] },
  { n: 2, title: "ماده ۱۹۲", doc_title: "قانون مالیات‌های مستقیم", status: "جاری", text: "جریمهٔ عدم تسلیم اظهارنامه…", note_display: "این ماده در ۱۴۰۴ اصلاح شده است.\nمنبع: قانون بودجهٔ ۱۴۰۴" },
  { n: 3, title: "بند ۲ بخشنامهٔ ۲۰۰/۱۴۰۳", doc_title: "بخشنامه‌ها", status: "منسوخ", text: "متن قدیمی…" },
  { n: 4, title: "ماده ۱۵۷", doc_title: "قانون مالیات‌های مستقیم", status: "جاری", text: "…" },
];

// ── routes ───────────────────────────────────────────────────────────────
async function api(req, res, path) {
  const me = cookieOf(req);
  if (path === "/api/health") return json(res, 200, { ok: true, llm: true });

  if (path === "/api/login" && req.method === "POST") {
    const b = await body(req);
    if (String(b.code || "").trim().toUpperCase() !== "TEST-CODE") return json(res, 401, { message: "کد دعوت نادرست است." });
    const a = [...accounts.values()].find((x) => x.kind === "invite") || newAccount("invite", { name: "آزمون دعوتی", mobile: "09120000000" });
    if (me?.kind === "guest") for (const s of sessions.values()) if (s.owner === me.id) s.owner = a.id;
    stamp(res, a);
    return json(res, 200, view(a));
  }
  if (path === "/api/logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", "trial_auth=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
    return json(res, 200, { ok: true });
  }
  if (path === "/api/session" && req.method === "POST") {
    let a = me;
    if (!a) {
      if (LEGACY) return json(res, 401, { message: "وارد نشده‌اید." });
      a = newAccount("guest");
      stamp(res, a);
    }
    const s = newSession(a);
    return json(res, 200, view(a, s.sid));
  }
  if (!LEGACY && path === "/api/sms/start" && req.method === "POST") {
    const b = await body(req);
    if (!/^09\d{9}$/.test(String(b.mobile || ""))) return json(res, 400, { message: "شمارهٔ موبایل درست نیست." });
    if (b.accept_terms !== true) return json(res, 400, { message: "پذیرش قوانین لازم است." });
    smsCodes.set(b.mobile, { code: "123456", name: String(b.name || "") });
    return json(res, 200, { resend_after: 60 });
  }
  if (!LEGACY && path === "/api/sms/verify" && req.method === "POST") {
    const b = await body(req);
    const rec = smsCodes.get(b.mobile);
    if (!rec || rec.code !== String(b.code)) return json(res, 401, { message: "کد درست نیست یا وقتش گذشته است." });
    let a = [...accounts.values()].find((x) => x.kind !== "guest" && x.mobile === b.mobile);
    if (!a) a = newAccount("sms", { name: rec.name, mobile: b.mobile });
    let current;
    if (me?.kind === "guest") {
      for (const s of sessions.values()) if (s.owner === me.id) {
        s.owner = a.id;
        current = s.sid;
      }
    }
    stamp(res, a);
    return json(res, 200, view(a, current));
  }

  if (!me) return json(res, 401, { message: "وارد نشده‌اید." });

  if (path === "/api/new" && req.method === "POST") {
    const s = newSession(me);
    return json(res, 200, view(me, s.sid));
  }
  if (path === "/api/event" || path === "/api/feedback") {
    const b = await body(req);
    if (path === "/api/feedback") {
      for (const s of sessions.values()) for (const t of s.turns) if (t.turn_id === b.turn_id) t.verdict = b.verdict;
    }
    return json(res, 200, { ok: true });
  }
  if (!LEGACY && path === "/api/sessions" && req.method === "GET") {
    // Guests see their own chats too (same cookie).
    const list = [...sessions.values()].filter((s) => s.owner === me.id && s.turns.length).sort((a, b) => b.updated.localeCompare(a.updated));
    return json(res, 200, { sessions: list.map((s) => ({ session_id: s.sid, title: s.title, updated_at: s.updated })) });
  }
  const m = /^\/api\/sessions\/([^/]+)$/.exec(path);
  if (!LEGACY && m && req.method === "GET") {
    const s = sessions.get(decodeURIComponent(m[1]));
    if (!s || s.owner !== me.id) return json(res, 404, { message: "گفتگو پیدا نشد." });
    return json(res, 200, { session_id: s.sid, turns: s.turns });
  }
  if (path === "/api/chat" && req.method === "POST") {
    const b = await body(req);
    const s = sessions.get(b.session_id);
    if (!s) return json(res, 400, { message: "نشست نامعتبر است. گفتگوی جدید بسازید." });
    if (s.owner !== me.id) return json(res, 403, { message: "این نشست برای این دعوت نیست." });
    if (BUSY) return json(res, 429, { code: "busy", message: "الان تپصره شلوغ است. یک دقیقهٔ دیگر دوباره بفرستید." }, { "Retry-After": "60" });
    if (me.used >= me.budget) {
      if (me.kind === "guest") return json(res, 429, { code: "quota_guest", message: "پرسش‌های رایگان تمام شد." });
      return json(res, 429, { code: "quota_daily", message: "سهم امروز تمام شد؛ ساعت ۱۲ شب به وقت ایران دوباره پر می‌شود." });
    }
    me.used += PER_Q;
    const turnId = turnSeq++;
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    for (const stage of ["rewrite", "retrieve", "pack", "generate"]) {
      send("status", { stage });
      await sleep(350);
    }
    let acc = "";
    for (const piece of ANSWER.match(/.{1,12}/gsu) || []) {
      acc += piece;
      send("token", { t: piece });
      await sleep(25);
    }
    send("sources", { sources: SOURCES, turn_id: turnId });
    if (!s.title) s.title = String(b.text).trim().slice(0, 60);
    s.updated = new Date().toISOString();
    const done = {
      text: acc,
      turn_id: turnId,
      sources: SOURCES,
      remaining_today: Math.max(0, Math.floor((me.budget - me.used) / PER_Q)),
      turn_in_session: s.turns.length + 1,
      validity_lines: [{ n: 1, lines: ["اعتبار از 1394/04/31 تا امروز"] }],
      law_from: ["تاریخ اجرای قانون: از 1395/01/01"],
    };
    if (!LEGACY) done.usage = usage(me);
    send("done", done);
    s.turns.push({ turn_id: turnId, q: String(b.text), a: acc, sources: SOURCES, validity_lines: done.validity_lines, law_from: done.law_from, verdict: null });
    return res.end();
  }
  return json(res, 404, { message: "نشانی پیدا نشد." });
}

async function file(res, path) {
  let rel = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, "");
  if (rel === "/" || rel === "") rel = "/index.html";
  let full = join(ROOT, rel);
  try {
    const st = await stat(full);
    if (st.isDirectory()) full = join(full, "index.html");
  } catch {
    if (!extname(full)) full += ".html";
  }
  try {
    const data = await readFile(full);
    res.writeHead(200, { "Content-Type": TYPES[extname(full)] || "application/octet-stream" });
    res.end(data);
  } catch {
    const nf = await readFile(join(ROOT, "404.html")).catch(() => Buffer.from("404"));
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(nf);
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  try {
    if (pathname.startsWith("/api/")) await api(req, res, pathname);
    else await file(res, pathname);
  } catch (e) {
    json(res, 500, { message: "خطای داخلی." });
    console.error(e);
  }
}).listen(PORT, "127.0.0.1", () => console.log(`mock ${LEGACY ? "(legacy) " : ""}on http://127.0.0.1:${PORT}`));
