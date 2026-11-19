"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { MSG } from "@/content/copy";
import { Dialog } from "./Dialog";

export function InviteDialog({
  onLogin,
  onSms,
  onRules,
  onClose,
}: {
  onLogin: (code: string) => Promise<void>;
  onSms?: () => void;
  onRules: () => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setErr("کد دعوت را وارد کنید.");
      return;
    }
    if (!agree) {
      setErr("برای ادامه، تیک قوانین و مقررات را بزنید.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await onLogin(code.trim());
    } catch (x) {
      const e2 = x as ApiError;
      setErr(e2.status === 429 ? e2.message || MSG.daily : e2.status === 0 ? MSG.net : MSG.inviteBad);
      setBusy(false);
    }
  }

  return (
    <Dialog label="ورود با کد دعوت" onClose={onClose}>
      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="dialog-head">
          <h2>ورود با کد دعوت</h2>
          <p>اگر از تپصره کد دعوت گرفته‌اید، این‌جا وارد کنید.</p>
        </div>
        <label className="field">
          کد دعوت
          <input
            className="input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            aria-describedby="i-err"
            style={{ fontSize: 18, letterSpacing: 2, textAlign: "center" }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
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
        <p className="err" id="i-err" role="alert">
          {err}
        </p>
        <button type="submit" className="btn" disabled={busy} style={{ width: "100%" }}>
          {busy ? "در حال ورود…" : "ورود"}
        </button>
        {onSms && (
          <p className="center">
            کد دعوت ندارید؟{" "}
            <button type="button" className="linkbtn" onClick={onSms}>
              با شمارهٔ موبایل وارد شوید
            </button>
          </p>
        )}
      </form>
    </Dialog>
  );
}
