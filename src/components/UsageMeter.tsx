"use client";

import type { Usage } from "@/lib/api";
import { fa } from "@/lib/fa";

/** Share of today's budget, like the usage line in chat assistants. Never shows token counts. */
export function UsageMeter({ usage, compact }: { usage?: Usage; compact?: boolean }) {
  if (!usage || typeof usage.pct !== "number") return null;
  const pct = Math.max(0, Math.min(100, Math.round(usage.pct)));
  const level = usage.exhausted || pct >= 100 ? "full" : pct >= 80 ? "high" : "";
  return (
    <div className="usage" style={compact ? { padding: 0 } : undefined}>
      <div className="usage-row">
        <span>مصرف امروز</span>
        <span>{fa(pct)}٪</span>
      </div>
      <div
        className="usage-track"
        role="progressbar"
        aria-label="مصرف امروز"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${fa(pct)} درصد از سهم امروز`}
      >
        <div className={`usage-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      {/* The server resets every account's share at 00:00 Tehran time (see API_CONTRACT.md). */}
      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>هر شب ساعت ۱۲ به وقت ایران صفر می‌شود</span>
    </div>
  );
}
