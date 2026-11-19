// Icon paths copied from the approved design (stroke icons, 24×24). Trusted static strings.
const PATHS: Record<string, string> = {
  plus: "<path d=\"M12 5v14\"/><path d=\"M5 12h14\"/>",
  sun: "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41\"/>",
  moon: "<path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"/>",
  menu: "<path d=\"M4 6h16M4 12h16M4 18h16\"/>",
  copy: "<rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1\"/>",
  send: "<g transform=\"translate(24 0) scale(-1 1)\"><path d=\"m22 2-7 20-4-9-9-4z\"/><path d=\"M22 2 11 13\"/></g>",
  panel: "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M15 3v18\"/>",
  chevup: "<path d=\"m18 15-6-6-6 6\"/>",
  chevdown: "<path d=\"m6 9 6 6 6-6\"/>",
  thumb: "<path d=\"M7 10v12\"/><path d=\"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z\"/>",
  thumbdown: "<g transform=\"rotate(180 12 12)\"><path d=\"M7 10v12\"/><path d=\"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z\"/></g>",
  shield: "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/><path d=\"m9 12 2 2 4-4\"/>",
  info: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 16v-4M12 8h.01\"/>",
  spin: "<path d=\"M21 12a9 9 0 1 1-6.22-8.56\"/>",
  book: "<path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z\"/><path d=\"M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5\"/>",
  search: "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m21 21-4.3-4.3\"/>",
  logout: "<g transform=\"translate(24 0) scale(-1 1)\"><path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><path d=\"M16 17l5-5-5-5\"/><path d=\"M21 12H9\"/></g>",
  phone: "<rect x=\"6\" y=\"2\" width=\"12\" height=\"20\" rx=\"2\"/><path d=\"M11 18h2\"/>",
  x: "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>",
  check: "<path d=\"M20 6 9 17l-5-5\"/>",
  alert: "<path d=\"M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>",
  lock: "<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>",
  refresh: "<path d=\"M21 12a9 9 0 1 1-2.64-6.36\"/><path d=\"M21 3v6h-6\"/>",
  chat: "<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/>",
  user: "<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: "none" }}
      dangerouslySetInnerHTML={{ __html: PATHS[name] || "" }}
    />
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 36 36" style={{ flex: "none" }}>
      <rect width="36" height="36" rx="10" fill="var(--primary)" />
      <path d="M12 8.5h8.5l5 5V27a1 1 0 0 1-1 1H12a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m14.5 19.5 2.6 2.6 5-5.2" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
