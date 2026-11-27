"use client";

import { useEffect, useState } from "react";
import { api, type Source } from "@/lib/api";
import { Answer } from "@/lib/answer";
import { fa } from "@/lib/fa";
import type { Turn } from "@/lib/types";
import { HELD, MSG, STAGE } from "@/content/copy";
import { Icon, Logo } from "./Icon";

function SourceItem({ s }: { s: Source }) {
  const ok = s.status === "جاری";
  return (
    <li className="src">
      <div className="src-top">
        {s.n != null && <span className="src-num">{fa(s.n)}</span>}
        <span className="src-title">{s.title}</span>
        {s.status && (
          <span className={`tag ${ok ? "ok" : "bad"}`}>
            <Icon name={ok ? "check" : "info"} size={14} />
            {s.status}
          </span>
        )}
      </div>
      {s.doc_title && <span className="src-doc">{s.doc_title}</span>}
      {s.note_display && (
        <div className="update-note">
          <b>به‌روزرسانی</b>
          {String(s.note_display)
            .split("\n")
            .filter(Boolean)
            .map((line, i) =>
              line.startsWith("منبع:") ? (
                <span key={i} className="cite">
                  {line}
                </span>
              ) : (
                <span key={i}>{line}</span>
              ),
            )}
        </div>
      )}
      {Array.isArray(s.validity_lines) && s.validity_lines.length > 0 && <p className="validity">{fa(s.validity_lines.join("\n"))}</p>}
      {s.text && <p className="src-text">{s.text}</p>}
    </li>
  );
}

function Sources({ sources, onOpen }: { sources: Source[]; onOpen: () => void }) {
  // Open by default, like the current page: the first three cards show, the rest behind a button.
  const [open, setOpen] = useState(true);
  const [more, setMore] = useState(false);
  const top = sources.slice(0, 3);
  const rest = sources.slice(3);
  return (
    <section className="sources" aria-label="منابع قانونی">
      <div className="sources-head">
        <button
          type="button"
          className="ghost"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name="book" size={18} />
          منابع ({fa(sources.length)})
          <Icon name={open ? "chevup" : "chevdown"} size={18} />
        </button>
      </div>
      {open && (
        <>
          <ul>
            {top.map((s, i) => (
              <SourceItem key={i} s={s} />
            ))}
            {more && rest.map((s, i) => <SourceItem key={`r${i}`} s={s} />)}
          </ul>
          {rest.length > 0 && (
            <div className="more">
              <button
                type="button"
                className="linkbtn"
                aria-expanded={more}
                onClick={() => {
                  if (!more) onOpen();
                  setMore(!more);
                }}
              >
                {more ? "کمتر نشان بده" : `منبع‌های دیگری که دیدم (${fa(rest.length)})`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Feedback({ turnId, text, initial }: { turnId: number; text: string; initial?: "ok" | "wrong" | null }) {
  const [sent, setSent] = useState<"ok" | "wrong" | null>(initial || null);
  const [wrongOpen, setWrongOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [copied, setCopied] = useState(false);

  async function send(verdict: "ok" | "wrong") {
    try {
      await api.feedback(turnId, verdict, verdict === "wrong" ? comment.trim() : undefined);
      setSent(verdict);
      setWrongOpen(false);
    } catch {
      /* the current page also stays silent here */
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Icon-only, like chat assistants: the label is in the tooltip and for screen readers. */}
      <div className="actions">
        <button
          type="button"
          className="act"
          aria-label={copied ? "کپی شد" : "کپی"}
          title={copied ? "کپی شد" : "کپی"}
          onClick={() => {
            navigator.clipboard
              ?.writeText(text)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => undefined);
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={18} />
        </button>
        <button
          type="button"
          className="act"
          aria-label="مفید بود"
          title="مفید بود"
          aria-pressed={sent === "ok"}
          disabled={!!sent}
          onClick={() => send("ok")}
        >
          <Icon name="thumb" size={18} />
        </button>
        <button
          type="button"
          className="act"
          aria-label="اشکال دارد"
          title="اشکال دارد"
          aria-pressed={sent === "wrong" || wrongOpen}
          aria-expanded={wrongOpen}
          disabled={!!sent}
          onClick={() => setWrongOpen((v) => !v)}
        >
          <Icon name="thumbdown" size={18} />
        </button>
        {sent && <span className="thanks">{MSG.thanks}</span>}
      </div>
      {wrongOpen && !sent && (
        <div className="wrongbox">
          <label className="sr-only" htmlFor={`w-${turnId}`}>
            اگر بگویید کجایش درست نبود، خیلی کمک می‌کند (اختیاری)
          </label>
          <textarea
            id={`w-${turnId}`}
            maxLength={1000}
            rows={3}
            placeholder="اگر بگویید کجایش درست نبود، خیلی کمک می‌کند (اختیاری)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => send("wrong")}>
              ثبت
            </button>
            <button type="button" className="btn2" onClick={() => setWrongOpen(false)}>
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Waiting({ stage, startedAt }: { stage?: string; startedAt?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const secs = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  return (
    <div className="wait" role="status" aria-live="polite">
      <b>دارم جواب را آماده می‌کنم</b>
      <span className="wait-stage">
        <Icon name="spin" size={18} className="spin" />
        {STAGE[stage || "rewrite"] || STAGE.rewrite}
      </span>
      <small>
        {fa(secs)} ثانیه · معمولاً کمتر از یک دقیقه طول می‌کشد.
      </small>
    </div>
  );
}

function Locked({ onSms, onInvite }: { onSms?: () => void; onInvite: () => void }) {
  return (
    <div className="held" role="status">
      <b>
        <Icon name="check" size={18} />
        {HELD.title}
      </b>
      <p>{onSms ? HELD.text : HELD.textInvite}</p>
      <div className="held-actions">
        {onSms && (
          <button type="button" className="btn" onClick={onSms}>
            <Icon name="phone" size={18} />
            ورود با شماره‌ی موبایل
          </button>
        )}
        <button type="button" className={onSms ? "btn2" : "btn"} onClick={onInvite}>
          {onSms ? "کد دعوت دارم" : "ورود با کد دعوت"}
        </button>
      </div>
    </div>
  );
}

export function TurnView({ turn, sid, onSms, onInvite }: { turn: Turn; sid: string; onSms?: () => void; onInvite?: () => void }) {
  return (
    <>
      <div className="u">
        <div className="u-bubble">{turn.q}</div>
      </div>
      <article className="bot" aria-busy={turn.state === "waiting" || turn.state === "streaming"}>
        <Logo size={32} />
        <div className="bot-body">
          {turn.state === "waiting" && <Waiting stage={turn.stage} startedAt={turn.startedAt} />}
          {turn.state === "error" && <p className="notice">{turn.error || MSG.net}</p>}
          {turn.state === "locked" && <Locked onSms={onSms} onInvite={onInvite || (() => undefined)} />}
          {(turn.state === "streaming" || turn.state === "done") && (
            <>
              {turn.state === "done" && turn.sources && <p className="basis">بر پایه‌ی {fa(turn.sources.length)} منبع</p>}
              <div className="prose" aria-live={turn.state === "streaming" ? "polite" : undefined}>
                <Answer text={turn.text} />
              </div>
              {turn.state === "done" && ((turn.validity && turn.validity.length > 0) || (turn.lawFrom && turn.lawFrom.length > 0)) && (
                <div className="validity-block">
                  {(turn.validity || []).flatMap((item, i) =>
                    (item.lines || []).map((line, j) => (
                      <p key={`${i}.${j}`} className="validity">
                        {item.n ? `منبع ${fa(item.n)}: ` : ""}
                        {fa(line)}
                      </p>
                    )),
                  )}
                  {(turn.lawFrom || []).map((line, i) => (
                    <p key={`l${i}`} className="validity law-from">
                      {fa(line)}
                    </p>
                  ))}
                </div>
              )}
              {turn.state === "done" && turn.sources && turn.sources.length > 0 && (
                <Sources sources={turn.sources} onOpen={() => sid && turn.turnId && api.event(sid, "source_open", turn.turnId)} />
              )}
              {turn.state === "done" && turn.turnId != null && <Feedback turnId={turn.turnId} text={turn.text} initial={turn.verdict} />}
            </>
          )}
        </div>
      </article>
    </>
  );
}
