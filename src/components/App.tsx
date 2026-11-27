"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, ApiError, chatStream, type Account, type PastTurn, type SessionSummary } from "@/lib/api";
import { fa } from "@/lib/fa";
import type { Turn } from "@/lib/types";
import { HELD, MSG } from "@/content/copy";
import { clearReloadMark } from "@/lib/reload";
import { Composer, type ComposerHandle } from "./Composer";
import { Icon } from "./Icon";
import { Sidebar } from "./Sidebar";
import { TurnView } from "./Turn";
import { Welcome } from "./Welcome";

// The theme lives on <html data-theme> (set before first paint by the script in layout.tsx);
// the page reads it from there, so the stored choice and the screen never disagree.
function subscribeTheme(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const readTheme = (): "light" | "dark" => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const serverTheme = (): "light" | "dark" => "light";
import { CodeDialog } from "./dialogs/CodeDialog";
import { GuideDialog } from "./dialogs/GuideDialog";
import { InviteDialog } from "./dialogs/InviteDialog";
import { RulesDialog } from "./dialogs/RulesDialog";
import { SignupDialog } from "./dialogs/SignupDialog";

type DialogKind = null | "signup" | "code" | "invite" | "guide";
type ChatsState = "idle" | "loading" | "error" | "unsupported";

let keySeq = 0;
const newKey = () => `t${Date.now().toString(36)}${(keySeq++).toString(36)}`;

function fromPast(p: PastTurn, i: number): Turn {
  return {
    key: `p${i}-${p.turn_id ?? i}`,
    q: p.q,
    state: p.a ? "done" : "error",
    text: p.a || "",
    error: p.a ? undefined : "پاسخ این پرسش ذخیره نشده است.",
    sources: p.sources,
    turnId: p.turn_id,
    validity: p.validity_lines,
    lawFrom: p.law_from,
    verdict: p.verdict ?? null,
    past: true,
  };
}

// A question asked before sign-in waits in this tab (not on any server) so a reload, or the phone dropping the tab
// while the person reads the SMS, does not lose it.
const HELD_KEY = "tp-held";
function saveHeld(text: string | null) {
  try {
    if (text) sessionStorage.setItem(HELD_KEY, text);
    else sessionStorage.removeItem(HELD_KEY);
  } catch {
    /* storage blocked: the question lasts until reload */
  }
}
function loadHeld(): string | null {
  try {
    return sessionStorage.getItem(HELD_KEY);
  } catch {
    return null;
  }
}
// The pause before the sign-in card, so the question feels received before sign-in is asked for.
const holdDelay = () => 3000 + Math.round(Math.random() * 1500);

type SignupReason = "quota" | "manual" | "ended" | "answer";

function setUrlChat(id: string | null) {
  try {
    const u = new URL(location.href);
    if (id) u.searchParams.set("c", id);
    else u.searchParams.delete("c");
    history.replaceState(null, "", u.toString());
  } catch {
    /* not important */
  }
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const [account, setAccountState] = useState<Account | null>(null);
  const [sid, setSidState] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [chats, setChats] = useState<SessionSummary[]>([]);
  const [chatsState, setChatsState] = useState<ChatsState>("idle");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [signupReason, setSignupReason] = useState<SignupReason>("manual");
  const [sms, setSms] = useState({ rest: "", name: "", mobile: "", resendAfter: 60 });
  const [sideOpen, setSideOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const [turnInSession, setTurnInSession] = useState(0);
  const [title, setTitle] = useState("");
  const [pageNote, setPageNote] = useState("");
  // False while the server has no SMS login and no guests (today's live server): then only invite login is offered.
  const [smsOk, setSmsOkState] = useState(true);

  // Refs mirror state so async flows (login → send the waiting question) never read stale values.
  const accountRef = useRef<Account | null>(null);
  const sidRef = useRef("");
  const pendingRef = useRef<string | null>(null);
  // The question on the page that waits for sign-in (nothing has been sent for it yet).
  const heldRef = useRef<{ key: string; text: string } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const smsOkRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const composer = useRef<ComposerHandle>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  const setAccount = useCallback((a: Account | null) => {
    accountRef.current = a;
    setAccountState(a);
  }, []);
  const mergeAccount = useCallback((j: Partial<Account>) => {
    const next = { ...(accountRef.current || {}), ...j };
    accountRef.current = next;
    setAccountState(next);
  }, []);
  const setSid = useCallback((s: string) => {
    sidRef.current = s;
    setSidState(s);
  }, []);
  const setSmsOk = useCallback((v: boolean) => {
    smsOkRef.current = v;
    setSmsOkState(v);
  }, []);

  const signedIn = !!account && account.account !== "guest";

  const refreshChats = useCallback(async () => {
    // Guests see their own chats too (only this browser's cookie owns them); after sign-up they move to the account.
    const a = accountRef.current;
    if (!a) {
      setChats([]);
      return;
    }
    setChatsState((s) => (s === "unsupported" ? s : "loading"));
    try {
      const j = await api.sessions();
      setChats(Array.isArray(j.sessions) ? j.sessions : []);
      setChatsState("idle");
    } catch (e) {
      const err = e as ApiError;
      setChatsState(err.status === 404 || err.status === 405 ? "unsupported" : "error");
    }
  }, []);

  const openSignup = useCallback((reason: SignupReason) => {
    setSignupReason(reason === "manual" && heldRef.current ? "answer" : reason);
    setDialog(smsOkRef.current ? "signup" : "invite");
    setSideOpen(false);
  }, []);

  const updateTurn = useCallback((key: string, patch: Partial<Turn> | ((t: Turn) => Partial<Turn>)) => {
    setTurns((all) => all.map((t) => (t.key === key ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)));
  }, []);

  const stopHoldTimer = useCallback(() => {
    if (holdTimer.current == null) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setBusy(false);
  }, []);

  // Not signed in: keep the question on the page and ask for sign-in. Nothing goes to the server before that;
  // right after sign-in, afterLogin sends it. With `pause`, the page first shows the usual waiting card for a moment.
  const hold = useCallback(
    (text: string, reason: SignupReason, pause: boolean) => {
      stopHoldTimer();
      const prev = heldRef.current;
      const key = newKey();
      heldRef.current = { key, text };
      pendingRef.current = text;
      saveHeld(text);
      pinned.current = true;
      const short = text.trim().slice(0, 60);
      setTitle((t) => (!t || (prev && t === prev.text.trim().slice(0, 60)) ? short : t));
      const turn: Turn = pause
        ? { key, q: text, state: "waiting", stage: "rewrite", startedAt: Date.now(), text: "", held: true }
        : { key, q: text, state: "locked", text: "", held: true };
      setTurns((all) => [...all.filter((t) => !t.held), turn]);
      if (!pause) {
        openSignup(reason);
        return;
      }
      setBusy(true);
      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = null;
        setBusy(false);
        updateTurn(key, { state: "locked" });
        openSignup(reason);
      }, holdDelay());
    },
    [openSignup, stopHoldTimer, updateTurn],
  );

  const dropHeld = useCallback(() => {
    stopHoldTimer();
    const h = heldRef.current;
    heldRef.current = null;
    pendingRef.current = null;
    saveHeld(null);
    if (h) setTurns((all) => all.filter((t) => t.key !== h.key));
  }, [stopHoldTimer]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw;
      if (!text.trim() || abortRef.current || holdTimer.current != null) return;
      if (!accountRef.current) {
        hold(text, "answer", true);
        return;
      }
      let s = sidRef.current;
      if (!s) {
        try {
          const j = await api.session();
          s = j.session_id || "";
          setSid(s);
          mergeAccount(j);
        } catch (e) {
          const err = e as ApiError;
          if (err.status === 401) {
            setAccount(null);
            hold(text, err.code === "login_required" ? "answer" : "ended", false);
          } else setPageNote(MSG.net);
          return;
        }
      }
      setPageNote("");
      const key = newKey();
      pinned.current = true;
      setTurns((all) => [...all, { key, q: text, state: "waiting", stage: "rewrite", startedAt: Date.now(), text: "" }]);
      if (!title) setTitle(text.trim().slice(0, 60));
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      let acc = "";
      let finished = false;
      try {
        for await (const ev of chatStream(s, text, ctrl.signal)) {
          if (ev.event === "status") updateTurn(key, { stage: ev.data.stage });
          else if (ev.event === "token") {
            acc += ev.data.t || "";
            updateTurn(key, { state: "streaming", text: acc });
          } else if (ev.event === "open") {
            acc = ev.data.text || acc;
            updateTurn(key, { state: "done", text: acc, turnId: ev.data.turn_id });
            finished = true;
          } else if (ev.event === "sources") {
            updateTurn(key, { sources: ev.data.sources || [], turnId: ev.data.turn_id });
          } else if (ev.event === "done") {
            const d = ev.data;
            if (d.text) acc = d.text;
            updateTurn(key, (t) => ({
              state: "done",
              text: acc,
              sources: d.sources || t.sources,
              turnId: d.turn_id ?? t.turnId,
              validity: d.validity_lines,
              lawFrom: d.law_from,
            }));
            if (typeof d.turn_in_session === "number") setTurnInSession(d.turn_in_session);
            const patch: Partial<Account> = {};
            if (d.usage) patch.usage = d.usage;
            if (typeof d.remaining_today === "number") patch.remaining_today = d.remaining_today;
            if (Object.keys(patch).length) mergeAccount(patch);
            finished = true;
          } else if (ev.event === "error") {
            updateTurn(key, { state: "error", error: ev.data.message || MSG.net });
            finished = true;
          }
        }
        if (!finished) {
          if (acc) updateTurn(key, { state: "done", text: acc });
          else updateTurn(key, { state: "error", error: MSG.net });
        }
        setUrlChat(s);
      } catch (e) {
        const err = e as ApiError;
        if (ctrl.signal.aborted) {
          setTurns((all) => all.filter((t) => t.key !== key));
        } else if (err.status === 401) {
          setTurns((all) => all.filter((t) => t.key !== key));
          setAccount(null);
          setSid("");
          hold(text, "ended", false);
        } else if (err.status === 429 && err.code === "quota_guest") {
          setTurns((all) => all.filter((t) => t.key !== key));
          pendingRef.current = text;
          openSignup("quota");
        } else if (err.code === "busy") {
          updateTurn(key, { state: "error", error: err.message || MSG.busy });
        } else if (err.status === 429) {
          const m = err.message || "";
          updateTurn(key, { state: "error", error: err.code === "quota_daily" ? m || MSG.daily : m.includes("ساعت") ? m : MSG.daily });
        } else if (err.status === 0 || err.status === 502 || err.status === 503) {
          updateTurn(key, { state: "error", error: MSG.net });
        } else {
          updateTurn(key, { state: "error", error: err.message || MSG.net });
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
        void refreshChats();
      }
    },
    [hold, mergeAccount, openSignup, refreshChats, setAccount, setSid, title, updateTurn],
  );

  const resetConversation = useCallback(() => {
    setTurns([]);
    setTurnInSession(0);
    setTitle("");
    setUrlChat(null);
  }, []);

  const newChat = useCallback(async () => {
    setSideOpen(false);
    abortRef.current?.abort();
    dropHeld();
    const old = sidRef.current;
    const hadTurns = turns.length > 0;
    resetConversation();
    if (!old || !hadTurns || !accountRef.current) return;
    try {
      const j = await api.newChat(old);
      setSid(j.session_id || "");
      mergeAccount(j);
    } catch (e) {
      setSid("");
      if ((e as ApiError).status === 401) setAccount(null);
    }
  }, [dropHeld, mergeAccount, resetConversation, setAccount, setSid, turns.length]);

  const openChat = useCallback(
    async (id: string) => {
      setSideOpen(false);
      if (id === sidRef.current && turns.length) return;
      abortRef.current?.abort();
      try {
        const j = await api.sessionTurns(id);
        setSid(id);
        setTurns((j.turns || []).map(fromPast));
        setTurnInSession((j.turns || []).length);
        setTitle(chats.find((c) => c.session_id === id)?.title || "");
        setUrlChat(id);
        setPageNote("");
        pinned.current = true;
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 401) {
          setAccount(null);
          openSignup("ended");
        } else setPageNote(err.status === 404 ? "این گفتگو پیدا نشد؛ شاید پاک شده باشد." : MSG.net);
      }
    },
    [chats, openSignup, setAccount, setSid, turns.length],
  );

  const afterLogin = useCallback(
    async (j: Account) => {
      const wasGuest = accountRef.current?.account === "guest";
      const held = heldRef.current;
      stopHoldTimer();
      setAccount({ ...j });
      // The server moves all of a guest's conversations into the new account; keep the one on screen open
      // (a guest may have reopened an older chat from the side menu). A question asked before sign-in starts
      // a fresh chat: the moved one holds earlier questions this page does not show.
      let s = (wasGuest ? sidRef.current : "") || (held ? "" : j.session_id || "");
      if (!s) {
        try {
          const k = await api.session();
          s = k.session_id || "";
          mergeAccount(k);
        } catch {
          s = "";
        }
      }
      setSid(s);
      setDialog(null);
      void refreshChats();
      const p = pendingRef.current;
      pendingRef.current = null;
      if (held) {
        heldRef.current = null;
        saveHeld(null);
        setTurns((all) => all.filter((t) => t.key !== held.key));
      }
      if (p) void send(p);
    },
    [mergeAccount, refreshChats, send, setAccount, setSid, stopHoldTimer],
  );

  const logout = useCallback(async () => {
    abortRef.current?.abort();
    dropHeld();
    await api.logout().catch(() => undefined);
    setAccount(null);
    setSid("");
    setChats([]);
    resetConversation();
    setSideOpen(false);
    try {
      const j = await api.session();
      setAccount(j);
      setSid(j.session_id || "");
    } catch {
      /* no guest mode: stay signed out */
    }
  }, [dropHeld, resetConversation, setAccount, setSid]);

  // First load: open a conversation (a guest one if the server allows), then the deep-linked chat if any.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const j = await api.session();
        if (cancelled) return;
        setAccount(j);
        setSid(j.session_id || "");
        setTurnInSession(j.turn_in_session || 0);
      } catch (e) {
        if (cancelled) return;
        const err = e as ApiError;
        // 401 «login_required»: sign-in is needed before asking. A bare 401 is today's live server: invite login only.
        if (err.status === 401) {
          if (err.code !== "login_required") setSmsOk(false);
        } else setPageNote(MSG.net);
      }
      if (cancelled) return;
      setBooted(true);
      const kept = loadHeld();
      if (kept && !accountRef.current) {
        // Back after a reload while signing in: show the question again; it is sent after sign-in.
        const key = newKey();
        heldRef.current = { key, text: kept };
        pendingRef.current = kept;
        setTurns([{ key, q: kept, state: "locked", text: "", held: true }]);
        setTitle(kept.trim().slice(0, 60));
      } else if (kept) saveHeld(null);
      await refreshChats();
      const c = new URLSearchParams(location.search).get("c");
      if (c && accountRef.current) void openChat(c);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once, on first load. The callbacks it uses read their state from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (holdTimer.current != null) clearTimeout(holdTimer.current);
    },
    [],
  );

  useEffect(() => {
    clearReloadMark();
  }, []);

  // Keep the newest answer in view while it streams, unless the reader scrolled up.
  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("tp-theme", next);
    } catch {
      /* storage blocked: the choice lasts until reload */
    }
  };

  const copyAll = () => {
    const text = turns.map((t) => `پرسش: ${t.q}\n\nپاسخ: ${t.text}`).join("\n\n———\n\n");
    navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  const usage = account?.usage;
  const note = usage
    ? `${fa(Math.round(Math.min(100, Math.max(0, usage.pct))))}٪ از سهم امروز مصرف شده`
    : account && typeof account.remaining_today === "number"
      ? `${fa(account.remaining_today)} سؤال برای امروز باقی مانده`
      : undefined;

  return (
    <div className="app">
      <a className="skip" href="#q">
        رفتن به جای نوشتن پرسش
      </a>
      <Sidebar
        open={sideOpen}
        account={account}
        chats={chats}
        chatsState={chatsState}
        currentId={sid}
        theme={theme}
        onClose={() => setSideOpen(false)}
        onNew={newChat}
        onOpenChat={openChat}
        onToggleTheme={toggleTheme}
        smsOk={smsOk}
        onSms={() => openSignup("manual")}
        onInvite={() => {
          setDialog("invite");
          setSideOpen(false);
        }}
        onRules={() => setRulesOpen(true)}
        onGuide={() => {
          setDialog("guide");
          setSideOpen(false);
        }}
        onLogout={logout}
      />
      <main className="main" id="main">
        <header className="topbar">
          <div className="lead">
            <button type="button" className="iconbtn mobile-only" aria-label="منو" aria-controls="side" aria-expanded={sideOpen} onClick={() => setSideOpen(true)}>
              <Icon name="menu" size={22} />
            </button>
            <h1>{title || "تپصره"}</h1>
          </div>
          {turns.length > 0 && (
            <button type="button" className="ghost desktop-only" onClick={copyAll}>
              <Icon name="copy" size={16} />
              کپی همه‌ی گفتگو
            </button>
          )}
          <button type="button" className="iconbtn mobile-only" aria-label="گفتگوی تازه" onClick={newChat}>
            <Icon name="plus" size={22} />
          </button>
        </header>
        <div
          className="scroll"
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {pageNote && (
            <div className="col" style={{ marginBottom: 16 }}>
              <p className="notice" role="alert">
                {pageNote}
              </p>
            </div>
          )}
          {turns.length === 0 ? (
            <Welcome show={booted} name={signedIn ? account?.name : undefined} onGuide={() => setDialog("guide")}>
              <Composer
                ref={composer}
                centered
                busy={busy}
                long={false}
                note={usage && usage.pct >= 80 ? note : undefined}
                onSend={send}
                onNew={newChat}
              />
            </Welcome>
          ) : (
            <div className="col">
              {turns.map((t) => (
                <TurnView
                  key={t.key}
                  turn={t}
                  sid={sid}
                  onSms={smsOk ? () => openSignup("answer") : undefined}
                  onInvite={() => {
                    setSignupReason("answer");
                    setDialog("invite");
                    setSideOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        {turns.length > 0 && <Composer ref={composer} busy={busy} long={turnInSession >= 4} note={note} onSend={send} onNew={newChat} />}
      </main>

      {dialog === "signup" && (
        <SignupDialog
          reason={signupReason}
          initialRest={sms.rest}
          initialName={sms.name}
          onSubmit={async (mobile, name) => {
            let r: { resend_after?: number };
            try {
              r = await api.smsStart(mobile, name);
            } catch (e) {
              if ((e as ApiError).status === 404) {
                // This server has no SMS login yet: offer the invite code instead.
                setSmsOk(false);
                setDialog("invite");
                return;
              }
              throw e;
            }
            setSms({ rest: mobile.slice(2), name, mobile, resendAfter: r.resend_after ?? 60 });
            setDialog("code");
          }}
          onInvite={() => setDialog("invite")}
          onRules={() => setRulesOpen(true)}
          onClose={() => {
            setDialog(null);
            if (!heldRef.current) pendingRef.current = null;
          }}
        />
      )}
      {dialog === "code" && (
        <CodeDialog
          mobile={sms.mobile}
          resendAfter={sms.resendAfter}
          onVerify={async (code) => afterLogin(await api.smsVerify(sms.mobile, code))}
          onResend={async () => (await api.smsStart(sms.mobile, sms.name)).resend_after}
          onEdit={() => setDialog("signup")}
          onClose={() => {
            setDialog(null);
            if (!heldRef.current) pendingRef.current = null;
          }}
        />
      )}
      {dialog === "invite" && (
        <InviteDialog
          lede={turns.some((t) => t.held) ? HELD.invite : undefined}
          onLogin={async (code) => afterLogin(await api.login(code))}
          onSms={smsOk ? () => setDialog("signup") : undefined}
          onRules={() => setRulesOpen(true)}
          onClose={() => {
            setDialog(null);
            if (!heldRef.current) pendingRef.current = null;
          }}
        />
      )}
      {dialog === "guide" && <GuideDialog dataUpdated={account?.data_updated} onClose={() => setDialog(null)} />}
      {rulesOpen && <RulesDialog onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
