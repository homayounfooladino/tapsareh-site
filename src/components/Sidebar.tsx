"use client";

import { useMemo, useState } from "react";
import type { Account, SessionSummary } from "@/lib/api";
import { showMobile } from "@/lib/fa";
import { Icon, Logo } from "./Icon";
import { UsageMeter } from "./UsageMeter";

function groupOf(iso?: string): "امروز" | "هفته‌ی گذشته" | "قدیمی‌تر" {
  if (!iso) return "قدیمی‌تر";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "قدیمی‌تر";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (t >= start.getTime()) return "امروز";
  if (t >= start.getTime() - 6 * 86400000) return "هفته‌ی گذشته";
  return "قدیمی‌تر";
}

export function Sidebar({
  open,
  account,
  chats,
  chatsState,
  currentId,
  smsOk,
  theme,
  onClose,
  onNew,
  onOpenChat,
  onToggleTheme,
  onSms,
  onInvite,
  onRules,
  onGuide,
  onLogout,
}: {
  open: boolean;
  account: Account | null;
  chats: SessionSummary[];
  chatsState: "idle" | "loading" | "error" | "unsupported";
  currentId: string;
  smsOk: boolean;
  theme: "light" | "dark";
  onClose: () => void;
  onNew: () => void;
  onOpenChat: (id: string) => void;
  onToggleTheme: () => void;
  onSms: () => void;
  onInvite: () => void;
  onRules: () => void;
  onGuide: () => void;
  onLogout: () => void;
}) {
  const [q, setQ] = useState("");
  const signedIn = !!account && account.account !== "guest";
  const groups = useMemo(() => {
    const list = q.trim() ? chats.filter((c) => c.title.includes(q.trim())) : chats;
    const order = ["امروز", "هفته‌ی گذشته", "قدیمی‌تر"] as const;
    return order
      .map((name) => ({ name, items: list.filter((c) => groupOf(c.updated_at) === name) }))
      .filter((g) => g.items.length > 0);
  }, [chats, q]);
  const initial = (account?.name || "").trim().charAt(0);

  return (
    <>
      {open && <div className="scrim mobile-only" onClick={onClose} aria-hidden="true" />}
      <aside className={open ? "side open" : "side"} aria-label="منوی کناری" id="side">
        <div className="side-head">
          <Logo size={30} />
          <b className="side-name">تپصره</b>
          <button
            type="button"
            className="theme-tg"
            aria-label={theme === "dark" ? "حالت روشن" : "حالت تیره"}
            title={theme === "dark" ? "حالت روشن" : "حالت تیره"}
            onClick={onToggleTheme}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
          <button type="button" className="iconbtn mobile-only" aria-label="بستن منو" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <button type="button" className="btn side-new" onClick={onNew}>
          <Icon name="plus" />
          گفتگوی تازه
        </button>

        {account ? (
          <>
            {!signedIn && (
              <div className="guest-box compact">
                <p>گفتگوهای مهمان فقط در همین مرورگر می‌ماند. با ورود، همیشه و روی هر دستگاهی در دسترس است.</p>
                {smsOk ? (
                  <>
                    <button type="button" className="btn2" onClick={onSms}>
                      <Icon name="phone" size={18} />
                      ورود با شماره‌ی موبایل
                    </button>
                    <button type="button" className="linkbtn" style={{ fontWeight: 500, fontSize: 14 }} onClick={onInvite}>
                      کد دعوت دارم
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn2" onClick={onInvite}>
                    <Icon name="lock" size={18} />
                    ورود با کد دعوت
                  </button>
                )}
              </div>
            )}
            <label className="search">
              <Icon name="search" size={18} />
              <input className="input" type="search" aria-label="جست‌وجو در گفتگوها" placeholder="جست‌وجو در گفتگوها" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <nav className="history" aria-label="گفتگوهای شما">
              {chatsState === "loading" && chats.length === 0 && <span className="history-empty">گفتگوهایتان را می‌آورم…</span>}
              {chatsState === "unsupported" && <span className="history-empty">فهرست گفتگوهای قبلی به‌زودی این‌جا می‌آید.</span>}
              {chatsState === "error" && <span className="history-empty">فهرست گفتگوها باز نشد؛ کمی بعد دوباره سر بزنید.</span>}
              {chatsState === "idle" && chats.length === 0 && <span className="history-empty">هنوز سؤالی نپرسیده‌اید؛ اولین سؤالتان را بنویسید.</span>}
              {chatsState === "idle" && chats.length > 0 && groups.length === 0 && <span className="history-empty">گفتگویی با این عبارت پیدا نشد.</span>}
              {groups.map((g) => (
                <div className="history-group" key={g.name}>
                  <span>{g.name}</span>
                  {g.items.map((c) => (
                    <button key={c.session_id} type="button" title={c.title} aria-current={c.session_id === currentId} onClick={() => onOpenChat(c.session_id)}>
                      {c.title}
                    </button>
                  ))}
                </div>
              ))}
            </nav>
          </>
        ) : (
          <>
            <div className="guest-box">
              {smsOk ? (
                <>
                  <p>بعد از ورود، گفتگوهایتان این‌جا می‌ماند تا هر وقت خواستید برگردید.</p>
                  <button type="button" className="btn2" onClick={onSms}>
                    <Icon name="phone" size={18} />
                    ورود با شماره‌ی موبایل
                  </button>
                  <button type="button" className="linkbtn" style={{ fontWeight: 500, fontSize: 14 }} onClick={onInvite}>
                    کد دعوت دارم
                  </button>
                </>
              ) : (
                <>
                  <p>برای پرسیدن، با کد دعوتی که از تپصره گرفته‌اید وارد شوید.</p>
                  <button type="button" className="btn2" onClick={onInvite}>
                    <Icon name="lock" size={18} />
                    ورود با کد دعوت
                  </button>
                </>
              )}
            </div>
            <div style={{ flex: 1 }} />
          </>
        )}

        <div className="side-foot">
          {account && <UsageMeter usage={account.usage} />}
          <button type="button" className="side-row" onClick={onGuide}>
            <Icon name="book" size={18} />
            راهنمای پرسیدن
          </button>
          <button type="button" className="side-row" onClick={onRules}>
            <Icon name="doc" size={18} />
            قوانین و مقررات تپصره
          </button>
          {signedIn && (
            <div className="me">
              <span className="me-badge" aria-hidden="true">
                {initial || <Icon name="user" size={18} />}
              </span>
              <div className="me-text">
                <b>{account?.name || "حساب شما"}</b>
                {account?.mobile && <span>{showMobile(account.mobile)}</span>}
              </div>
              <button type="button" className="iconbtn" aria-label="خروج از حساب" onClick={onLogout}>
                <Icon name="logout" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
