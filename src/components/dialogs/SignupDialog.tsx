"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { fa, fullMobile, mobileRest } from "@/lib/fa";
import { HELD, MSG } from "@/content/copy";
import { Dialog } from "./Dialog";

export function SignupDialog({
  reason,
  initialRest = "",
  initialName = "",
  onSubmit,
  onInvite,
  onRules,
  onClose,
}: {
  reason: "quota" | "manual" | "ended" | "answer";
  initialRest?: string;
  initialName?: string;
  onSubmit: (mobile: string, name: string) => Promise<void>;
  onInvite: () => void;
  onRules: () => void;
  onClose: () => void;
}) {
  const [rest, setRest] = useState(initialRest);
  const [name, setName] = useState(initialName);
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const mobile = fullMobile(rest);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mobile) {
      setErr("شمارهٔ موبایل باید ۱۱ رقم باشد و با ۰۹ شروع شود.");
      return;
    }
    if (!agree) {
      setErr("برای ادامه، تیک قوانین و مقررات را بزنید.");
      return;
    }
    setErr("");
    setSending(true);
    try {
      await onSubmit(mobile, name.trim());
    } catch (x) {
      const e2 = x as ApiError;
      setErr(e2.message || (e2.status === 0 ? MSG.net : "ارسال کد انجام نشد. کمی بعد دوباره امتحان کنید."));
    } finally {
      setSending(false);
    }
  }

  const LEDE = {
    answer: HELD.signup,
    quota: "پرسش‌های رایگان امروز تمام شد. پس از تأیید شماره، همین پرسش خودکار فرستاده می‌شود.",
    ended: "نشست شما تمام شده؛ دوباره وارد شوید.",
    manual: "با شمارهٔ موبایل وارد شوید تا گفتگوهایتان بماند.",
  };
  const lede = LEDE[reason];

  return (
    <Dialog label="ورود با شمارهٔ موبایل" onClose={onClose}>
      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="dialog-head">
          <h2>برای ادامه، شمارهٔ موبایلتان را وارد کنید</h2>
          <p>{lede}</p>
        </div>
        <label className="field" htmlFor="m-rest">
          شمارهٔ موبایل
          <span className="mobile-box">
            <span className="pre" aria-hidden="true">
              ۰۹
            </span>
            <input
              id="m-rest"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              dir="ltr"
              aria-describedby="m-help m-err"
              placeholder="۱۲ ۳۴۵ ۶۷۸۹"
              value={fa(rest)}
              onChange={(e) => setRest(mobileRest(e.target.value))}
              onPaste={(e) => {
                e.preventDefault();
                setRest(mobileRest(e.clipboardData.getData("text")));
              }}
            />
          </span>
          <span id="m-help" style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>
            «۰۹» نوشته شده؛ فقط ۹ رقم بعدی را بزنید.
          </span>
        </label>
        <label className="field">
          نام (اختیاری)
          <input className="input" type="text" autoComplete="name" placeholder="مثلاً رضا محمدی" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            <button type="button" className="linkbtn" style={{ minHeight: 0, fontSize: 15 }} onClick={onRules}>
              قوانین و مقررات تپصره
            </button>{" "}
            را خوانده‌ام و می‌پذیرم.
          </span>
        </label>
        <p className="err" id="m-err" role="alert">
          {err}
        </p>
        <button type="submit" className="btn" disabled={sending} style={{ width: "100%" }}>
          {sending ? "در حال فرستادن کد…" : "دریافت کد تأیید"}
        </button>
        <p className="center">
          کد دعوت دارید؟{" "}
          <button type="button" className="linkbtn" onClick={onInvite}>
            با کد دعوت وارد شوید
          </button>
        </p>
      </form>
    </Dialog>
  );
}
