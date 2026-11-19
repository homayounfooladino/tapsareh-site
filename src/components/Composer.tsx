"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { DISCLAIMER, MSG } from "@/content/copy";
import { Icon } from "./Icon";

export interface ComposerHandle {
  fill: (text: string) => void;
}

const MAX = 4000;

export const Composer = forwardRef<ComposerHandle, { busy: boolean; long: boolean; note?: string; onSend: (text: string) => void; onNew: () => void }>(
  function Composer({ busy, long, note, onSend, onNew }, ref) {
    const [text, setText] = useState("");
    const area = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      fill: (t: string) => {
        setText(t);
        requestAnimationFrame(() => area.current?.focus());
      },
    }));

    function submit() {
      const t = text.trim();
      if (!t || busy) return;
      onSend(text);
      setText("");
    }

    const tooLong = text.length > MAX;

    return (
      <div className="composer-wrap">
        <form
          className="composer"
          aria-label="فرستادن پرسش"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {long && (
            <div className="longnote">
              <span>{MSG.long}</span>
              <button type="button" className="btn2" onClick={onNew}>
                گفتگوی جدید
              </button>
            </div>
          )}
          <div className="box">
            <label className="sr-only" htmlFor="q">
              سؤال شما
            </label>
            <textarea
              id="q"
              ref={area}
              rows={2}
              placeholder="پرسش مالیاتی‌تان را بنویسید؛ مثلاً «مهلت اظهارنامهٔ اجاره تا کی است؟»"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter makes a new line. Not while an input method is composing.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="box-row">
              <span className="box-note" aria-live="polite">
                {tooLong ? (
                  <span style={{ color: "var(--red-ink)" }}>سؤال خیلی بلند است (حداکثر ۴۰۰۰ نویسه).</span>
                ) : note ? (
                  <>
                    <Icon name="info" size={16} />
                    {note}
                  </>
                ) : null}
              </span>
              <button type="submit" className="btn" aria-label="ارسال" style={{ minHeight: 44, padding: "0 18px" }} disabled={busy || !text.trim() || tooLong}>
                <Icon name="send" size={18} />
                <span className="send-label">ارسال</span>
              </button>
            </div>
          </div>
          <p className="legal">{DISCLAIMER}</p>
        </form>
      </div>
    );
  },
);
