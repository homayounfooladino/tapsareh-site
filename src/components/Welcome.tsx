"use client";

import { LEDE, SAMPLES } from "@/content/copy";
import { Icon, Logo } from "./Icon";

export function Welcome({ name, onPick, onGuide }: { name?: string; onPick: (q: string) => void; onGuide: () => void }) {
  return (
    <div className="welcome">
      <div className="col">
        <div className="welcome-head">
          <Logo size={56} />
          <h2>{name ? `سلام ${name}، خوش آمدید` : "پرسش مالیاتی‌تان را بپرسید"}</h2>
          <p>{LEDE}</p>
        </div>
        <div className="cards">
          {SAMPLES.map((s) => (
            <button key={s.q} type="button" className="card-q" onClick={() => onPick(s.q)}>
              <span>{s.tag}</span>
              {s.q}
            </button>
          ))}
        </div>
        <div className="trust">
          <span>
            <Icon name="book" size={18} />
            منبع هر پاسخ نشان داده می‌شود
          </span>
          <span>
            <Icon name="shield" size={18} />
            برچسب «جاری» یا «منسوخ» کنار هر منبع
          </span>
          <button type="button" className="linkbtn" style={{ fontSize: 14 }} onClick={onGuide}>
            چطور بپرسم؟
          </button>
        </div>
      </div>
    </div>
  );
}
