"use client";

import { GUIDE_ITEMS, GUIDE_TITLE } from "@/content/copy";
import { inline } from "@/lib/answer";
import { Dialog } from "./Dialog";

export function GuideDialog({ dataUpdated, onClose }: { dataUpdated?: string; onClose: () => void }) {
  return (
    <Dialog label={GUIDE_TITLE} onClose={onClose} wide>
      <div className="dialog-head">
        <h2>{GUIDE_TITLE}</h2>
        {dataUpdated && <p style={{ fontSize: 13.5, color: "var(--muted)" }}>قوانین به‌روز تا {dataUpdated}</p>}
      </div>
      <ul className="guide-list">
        {GUIDE_ITEMS.map((item, i) => (
          <li key={i}>{inline(item, `g${i}`)}</li>
        ))}
      </ul>
      <button type="button" className="btn" onClick={onClose}>
        متوجه شدم
      </button>
    </Dialog>
  );
}
