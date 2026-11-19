"use client";

import { TERMS_BULLETS, TERMS_UPDATED } from "@/content/terms";
import { Dialog } from "./Dialog";

export function RulesDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog label="قوانین و مقررات تپصره" onClose={onClose} wide>
      <div className="dialog-head">
        <h2>قوانین و مقررات تپصره</h2>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>آخرین به‌روزرسانی: {TERMS_UPDATED}</p>
      </div>
      <ul className="rules-list">
        {TERMS_BULLETS.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <button type="button" className="btn" onClick={onClose}>
        متوجه شدم
      </button>
    </Dialog>
  );
}
