"use client";

import type { Usage } from "@/lib/api";
import { fa } from "@/lib/fa";

/** Share of today's budget, like the usage line in chat assistants. Never shows token counts. */
export function UsageMeter({ usage, compact }: { usage?: Usage; compact?: boolean }) {
  if (!usage || typeof usage.pct !== "number") return null;
  const pct = Math.max(0, Math.min(100, Math.round(usage.pct)));
  const level = usage.exhausted || pct >= 100 ? "full" : pct >= 80 ? "high" : "";
  return (
    <div className="usage" style={compact ? { padding: 0 } : undefined} title="نیمه‌شب به وقت ایران دوباره پر می‌شود">
      <div className="usage-row">
        <span>سهم امروز</span>
        <span>{fa(pct)}٪</span>
      </div>
      <div
        className="usage-track"
        role="progressbar"
        aria-label="سهم امروز"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${fa(pct)} درصد از سهم امروز`}
      >
        <div className={`usage-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      {/* The server resets every account's share at 00:00 Tehran time (see API_CONTRACT.md); said in the tooltip. */}
    </div>
  );
}
