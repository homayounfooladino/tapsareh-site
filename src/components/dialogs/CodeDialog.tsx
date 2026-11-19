"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { codeDigits, fa, showMobile } from "@/lib/fa";
import { MSG } from "@/content/copy";
import { Dialog } from "./Dialog";

export function CodeDialog({
  mobile,
  resendAfter,
  onVerify,
  onResend,
  onEdit,
  onClose,
}: {
  mobile: string;
  resendAfter: number;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<number | undefined>;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [until, setUntil] = useState(() => Date.now() + resendAfter * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, Math.ceil((until - now) / 1000));
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  async function verify(value: string) {
    if (value.length !== 6) {
      setErr("کد ۶ رقمی را کامل وارد کنید.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await onVerify(value);
    } catch (x) {
      const e = x as ApiError;
      setErr(e.message || (e.status === 0 ? MSG.net : "کد درست نیست."));
      setBusy(false);
    }
  }

  async function resend() {
    setErr("");
    try {
      const after = await onResend();
      setUntil(Date.now() + (after ?? 60) * 1000);
    } catch (x) {
      const e = x as ApiError;
      setErr(e.message || MSG.net);
      if (e.retryAfter) setUntil(Date.now() + e.retryAfter * 1000);
    }
  }

  return (
    <Dialog label="کد تأیید" onClose={onClose}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div className="dialog-head">
          <h2>کد تأیید را وارد کنید</h2>
          <p>
            کد ۶ رقمی به{" "}
            <span style={{ direction: "ltr", unicodeBidi: "isolate", fontWeight: 600, color: "var(--text)" }}>{showMobile(mobile)}</span> پیامک شد.{" "}
            <button type="button" className="linkbtn" style={{ minHeight: 0, fontSize: 15, fontWeight: 500 }} onClick={onEdit}>
              ویرایش شماره
            </button>
          </p>
        </div>
        <label className="field">
          کد ۶ رقمی
          <input
            className="input code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            maxLength={12}
            aria-describedby="c-err"
            value={fa(code)}
            onChange={(e) => {
              const v = codeDigits(e.target.value);
              setCode(v);
              if (v.length === 6 && !busy) void verify(v);
            }}
          />
        </label>
        <p className="err" id="c-err" role="alert">
          {err}
        </p>
        <button type="submit" className="btn" disabled={busy} style={{ width: "100%" }}>
          {busy ? "در حال بررسی…" : "تأیید و ادامه"}
        </button>
        <div className="resend">
          <button type="button" className="ghost" disabled={left > 0} onClick={resend} style={left > 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
            ارسال دوباره
          </button>
          {left > 0 && <span>تا {fa(mmss)} دیگر</span>}
        </div>
      </form>
    </Dialog>
  );
}
