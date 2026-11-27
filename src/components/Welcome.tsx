"use client";

import type { ReactNode } from "react";
import { LEDE, SAMPLES } from "@/content/copy";
import { Icon, Logo } from "./Icon";

// The question box (children) sits in the middle of the start page. Sample questions are plain examples of how to
// ask; they are not clickable until the frequently asked questions are chosen.
export function Welcome({ show, name, onGuide, children }: { show: boolean; name?: string; onGuide: () => void; children: ReactNode }) {
  const hello = "سؤال مالیاتی دارید؟ کمکتان می‌کنم.";
  return (
    <div className="welcome">
      <div className="col">
        {show && (
          <div className="welcome-head">
            <Logo size={48} />
            <h2>{name ? `سلام ${name}! ${hello}` : `سلام! ${hello}`}</h2>
            <p>{LEDE}</p>
          </div>
        )}
        {children}
        {show && (
          <>
            <div className="examples">
              <b>مثلاً این‌طور بپرسید:</b>
              <ul>
                {SAMPLES.map((s) => (
                  <li key={s.q}>{s.q}</li>
                ))}
              </ul>
            </div>
            <div className="trust">
              <span>
                <Icon name="book" size={17} />
                کنار هر جواب، ماده‌ی قانونی‌اش را می‌بینید
              </span>
              <span>
                <Icon name="shield" size={17} />
                معلوم است کدام قانون هنوز معتبر است
              </span>
              <button type="button" className="linkbtn" style={{ fontSize: 13.5 }} onClick={onGuide}>
                راهنمای پرسیدن
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
