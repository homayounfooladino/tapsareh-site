// Demo only. Answers /api/* inside the browser so the page can be clicked through without Spark.
// Same behaviour as dev/mock-server.mjs. Never part of the real build.
(function () {
  "use strict";
  var realFetch = window.fetch.bind(window);
  var KEY = "tp-demo";
  var PER_Q = 6000;
  var BUDGET = { guest: 3 * PER_Q, sms: 150000, invite: 300000 };
  var st = null;
  try { st = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { st = null; }
  if (!st) st = { me: null, accounts: {}, sessions: {}, sms: {}, seq: 1000 };
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch { /* fine */ } }
  function rid() { return Math.random().toString(36).slice(2, 12) + Date.now().toString(36); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function json(status, body) {
    return new Response(JSON.stringify(body), { status: status, headers: { "Content-Type": "application/json" } });
  }
  function account(kind, extra) {
    var a = { id: rid(), kind: kind, name: "", mobile: "", used: 0 };
    for (var k in extra || {}) a[k] = extra[k];
    st.accounts[a.id] = a;
    return a;
  }
  function usage(a) {
    var b = BUDGET[a.kind];
    return { pct: Math.min(100, Math.round((100 * a.used) / b)), resets_at: "00:00", exhausted: a.used >= b };
  }
  function view(a, sid) {
    var out = {
      name: a.name || undefined, account: a.kind, mobile: a.mobile || undefined, usage: usage(a),
      remaining_today: Math.max(0, Math.floor((BUDGET[a.kind] - a.used) / PER_Q)),
      turn_in_session: sid && st.sessions[sid] ? st.sessions[sid].turns.length : 0,
      data_updated: "۱۴۰۵/۰۸/۲۷",
    };
    if (sid) out.session_id = sid;
    return out;
  }
  function newSession(a) {
    var s = { sid: rid(), owner: a.id, title: "", updated: new Date().toISOString(), turns: [] };
    st.sessions[s.sid] = s;
    return s;
  }
  function me() { return st.me ? st.accounts[st.me] : null; }

  var ANSWER =
    "**این یک پاسخ نمایشی است** تا شکل صفحه را ببینید؛ پاسخ واقعی را موتور تپصره روی اسپارک می‌دهد.\n\n" +
    "خلاصه: تا چهار ماه پس از پایان سال مالی؛ برای شرکتی که سال مالی‌اش پایان اسفند است، تا **پایان تیر**.\n\n" +
    "طبق ماده ۱۱۰ قانون مالیات‌های مستقیم، اشخاص حقوقی باید اظهارنامه، ترازنامه و حساب سود و زیان را در این مهلت بدهند:\n" +
    "- اگر سال مالی با سال شمسی یکی نیست، چهار ماه از پایان همان سال مالی شمرده می‌شود.\n" +
    "- تسلیم دیرهنگام جریمه دارد (ماده ۱۹۲).\n\n" +
    "1. اظهارنامه را در سامانه پر کنید.\n2. پیوست‌ها را بارگذاری کنید.";
  var SOURCES = [
    { n: 1, title: "ماده ۱۱۰", doc_title: "قانون مالیات‌های مستقیم", status: "جاری", text: "اشخاص حقوقی مکلف‌اند اظهارنامه و ترازنامه و حساب سود و زیان را حداکثر تا چهار ماه پس از سال مالی تسلیم کنند…", validity_lines: ["اعتبار از 1394/04/31 تا امروز"] },
    { n: 2, title: "ماده ۱۹۲", doc_title: "قانون مالیات‌های مستقیم", status: "جاری", text: "جریمهٔ عدم تسلیم اظهارنامه…", note_display: "این ماده در ۱۴۰۴ اصلاح شده است.\nمنبع: قانون بودجهٔ ۱۴۰۴" },
    { n: 3, title: "بند ۲ بخشنامهٔ ۲۰۰/۱۴۰۳", doc_title: "بخشنامه‌ها", status: "منسوخ", text: "متن قدیمی…" },
    { n: 4, title: "ماده ۱۵۷", doc_title: "قانون مالیات‌های مستقیم", status: "جاری", text: "…" },
  ];

  function chat(body) {
    var a = me();
    var s = st.sessions[body.session_id];
    if (!a) return json(401, { message: "وارد نشده‌اید." });
    if (!s || s.owner !== a.id) return json(400, { message: "نشست نامعتبر است. گفتگوی جدید بسازید." });
    if (a.used >= BUDGET[a.kind]) {
      if (a.kind === "guest") return json(429, { code: "quota_guest", message: "پرسش‌های رایگان تمام شد." });
      return json(429, { code: "quota_daily", message: "سهم امروز تمام شد؛ ساعت ۱۲ شب به وقت ایران دوباره پر می‌شود." });
    }
    a.used += PER_Q;
    var turnId = st.seq++;
    var enc = new TextEncoder();
    var stream = new ReadableStream({
      start: function (c) {
        function send(ev, data) { c.enqueue(enc.encode("event: " + ev + "\ndata: " + JSON.stringify(data) + "\n\n")); }
        (async function () {
          var stages = ["rewrite", "retrieve", "pack", "generate"];
          for (var i = 0; i < stages.length; i++) { send("status", { stage: stages[i] }); await wait(700); }
          var acc = "";
          var parts = ANSWER.match(/[\s\S]{1,10}/g) || [];
          for (var j = 0; j < parts.length; j++) { acc += parts[j]; send("token", { t: parts[j] }); await wait(28); }
          send("sources", { sources: SOURCES, turn_id: turnId });
          if (!s.title) s.title = String(body.text).trim().slice(0, 60);
          s.updated = new Date().toISOString();
          var done = {
            text: acc, turn_id: turnId, sources: SOURCES, usage: usage(a),
            remaining_today: Math.max(0, Math.floor((BUDGET[a.kind] - a.used) / PER_Q)),
            turn_in_session: s.turns.length + 1,
            validity_lines: [{ n: 1, lines: ["اعتبار از 1394/04/31 تا امروز"] }],
            law_from: ["تاریخ اجرای قانون: از 1395/01/01"],
          };
          s.turns.push({ turn_id: turnId, q: String(body.text), a: acc, sources: SOURCES, validity_lines: done.validity_lines, law_from: done.law_from, verdict: null });
          save();
          send("done", done);
          c.close();
        })();
      },
    });
    save();
    return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  }

  async function handle(path, method, body) {
    var a = me();
    if (path === "/api/session" && method === "POST") {
      if (!a) { a = account("guest"); st.me = a.id; }
      var s = newSession(a);
      save();
      return json(200, view(a, s.sid));
    }
    if (path === "/api/login") {
      if (String(body.code || "").trim().toUpperCase() !== "TEST-CODE") return json(401, { message: "کد دعوت نادرست است." });
      var inv = null;
      for (var k in st.accounts) if (st.accounts[k].kind === "invite") inv = st.accounts[k];
      if (!inv) inv = account("invite", { name: "کاربر دعوتی", mobile: "09120000000" });
      if (a && a.kind === "guest") for (var x in st.sessions) if (st.sessions[x].owner === a.id) st.sessions[x].owner = inv.id;
      st.me = inv.id;
      save();
      return json(200, view(inv));
    }
    if (path === "/api/logout") { st.me = null; save(); return json(200, { ok: true }); }
    if (path === "/api/sms/start") {
      if (!/^09\d{9}$/.test(String(body.mobile || ""))) return json(400, { message: "شمارهٔ موبایل درست نیست." });
      st.sms[body.mobile] = { name: String(body.name || "") };
      save();
      await wait(500);
      return json(200, { resend_after: 60 });
    }
    if (path === "/api/sms/verify") {
      await wait(400);
      if (String(body.code) !== "123456" || !st.sms[body.mobile]) return json(401, { message: "کد درست نیست یا وقتش گذشته است." });
      var acc = null;
      for (var y in st.accounts) if (st.accounts[y].kind !== "guest" && st.accounts[y].mobile === body.mobile) acc = st.accounts[y];
      if (!acc) acc = account("sms", { name: st.sms[body.mobile].name, mobile: body.mobile });
      var current;
      if (a && a.kind === "guest") for (var z in st.sessions) if (st.sessions[z].owner === a.id) { st.sessions[z].owner = acc.id; current = z; }
      st.me = acc.id;
      save();
      return json(200, view(acc, current));
    }
    if (!a) return json(401, { message: "وارد نشده‌اید." });
    if (path === "/api/new") { var n = newSession(a); save(); return json(200, view(a, n.sid)); }
    if (path === "/api/event") return json(200, { ok: true });
    if (path === "/api/feedback") {
      for (var q in st.sessions) st.sessions[q].turns.forEach(function (t) { if (t.turn_id === body.turn_id) t.verdict = body.verdict; });
      save();
      return json(200, { ok: true });
    }
    if (path === "/api/sessions") {
      if (a.kind === "guest") return json(200, { sessions: [] });
      var list = Object.keys(st.sessions).map(function (k) { return st.sessions[k]; })
        .filter(function (s) { return s.owner === a.id && s.turns.length; })
        .sort(function (p, r) { return r.updated.localeCompare(p.updated); });
      return json(200, { sessions: list.map(function (s) { return { session_id: s.sid, title: s.title, updated_at: s.updated }; }) });
    }
    var m = /^\/api\/sessions\/([^/]+)$/.exec(path);
    if (m) {
      var ss = st.sessions[decodeURIComponent(m[1])];
      if (!ss || ss.owner !== a.id) return json(404, { message: "گفتگو پیدا نشد." });
      return json(200, { session_id: ss.sid, turns: ss.turns });
    }
    if (path === "/api/chat") return chat(body);
    return json(404, { message: "نشانی پیدا نشد." });
  }

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input && input.url;
    if (typeof url !== "string" || url.indexOf("/api/") !== 0) return realFetch(input, init);
    var path = url.split("?")[0];
    var method = (init && init.method) || "GET";
    var body = {};
    try { body = init && init.body ? JSON.parse(init.body) : {}; } catch { body = {}; }
    return handle(path, method, body);
  };

  // The «demo» strip is drawn by CSS (html::before) in make-demo.mjs, so React's DOM stays untouched.
})();
