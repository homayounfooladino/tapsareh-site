// Talks to the Python server on the same origin. Existing paths and events stay as they are today;
// the fields and paths marked «new» are additive (see API_CONTRACT.md).

export type AccountKind = "guest" | "sms" | "invite";

export interface Usage {
  pct: number; // 0–100, share of today's token budget already used
  resets_at?: string; // shown as is, e.g. «۰۰:۰۰»
  exhausted?: boolean;
}

export interface Account {
  session_id?: string;
  name?: string;
  mobile?: string; // new: the user's own number, shown in the side menu
  account?: AccountKind; // new
  usage?: Usage; // new
  remaining_today?: number;
  turn_in_session?: number;
  data_updated?: string;
}

export interface Source {
  n?: number;
  title?: string;
  doc_title?: string;
  text?: string;
  status?: string;
  validity_lines?: string[];
  note_display?: string;
}

export interface ValidityItem {
  n?: number;
  lines?: string[];
}

export interface DoneData {
  text?: string;
  turn_id?: number;
  sources?: Source[];
  remaining_today?: number;
  turn_in_session?: number;
  validity_lines?: ValidityItem[];
  law_from?: string[];
  usage?: Usage;
  understood_as?: string; // #703: only for a follow-up the server really rewrote
}

export interface SessionSummary {
  session_id: string;
  title: string;
  updated_at?: string; // ISO time, used only for grouping (today / this week / older)
}

export interface PastTurn {
  turn_id?: number;
  q: string;
  a?: string;
  sources?: Source[];
  validity_lines?: ValidityItem[];
  law_from?: string[];
  verdict?: "ok" | "wrong" | null;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;
  constructor(status: number, message: string, code?: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const testerQS = () =>
  typeof location !== "undefined" && new URLSearchParams(location.search).get("tester") === "1"
    ? "?tester=1"
    : "";

async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init || {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      method: rest.method || (json !== undefined ? "POST" : "GET"),
      headers: json !== undefined ? { "Content-Type": "application/json" } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "");
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const retry = Number(res.headers.get("Retry-After") || body.retry_after || 0) || undefined;
    throw new ApiError(res.status, String(body.message || ""), body.code ? String(body.code) : undefined, retry);
  }
  return body as T;
}

export const api = {
  /** Opens a conversation. Without a cookie the server makes a guest (new). */
  session: () => call<Account>("/api/session" + testerQS(), { method: "POST" }),
  newChat: (session_id: string) =>
    call<Account>("/api/new" + testerQS(), { json: { session_id, reason: "new_chat" } }),
  login: (code: string) => call<Account>("/api/login", { json: { code, accept_terms: true } }),
  logout: () => call<{ ok: boolean }>("/api/logout", { method: "POST" }),
  feedback: (turn_id: number, verdict: "ok" | "wrong", comment?: string) =>
    call<{ ok: boolean }>("/api/feedback", { json: { turn_id, verdict, comment: comment || null } }),
  event: (session_id: string, event_type: string, turn_id?: number) =>
    call<{ ok: boolean }>("/api/event", { json: { session_id, event_type, turn_id } }).catch(() => undefined),
  // new
  smsStart: (mobile: string, name: string) =>
    call<{ resend_after?: number }>("/api/sms/start", { json: { mobile, name: name || null, accept_terms: true } }),
  smsVerify: (mobile: string, code: string) => call<Account>("/api/sms/verify", { json: { mobile, code } }),
  sessions: () => call<{ sessions: SessionSummary[] }>("/api/sessions"),
  sessionTurns: (id: string) =>
    call<{ session_id: string; turns: PastTurn[] }>(`/api/sessions/${encodeURIComponent(id)}`),
};

export type StreamEvent =
  | { event: "status"; data: { stage?: string; understood_as?: string } }
  | { event: "token"; data: { t?: string } }
  | { event: "sources"; data: { sources?: Source[]; turn_id?: number } }
  | { event: "open"; data: { text?: string; turn_id?: number } }
  | { event: "done"; data: DoneData }
  | { event: "error"; data: { message?: string } };

/** POST /api/chat and read the server-sent events. Throws ApiError for non-200 answers. */
export async function* chatStream(session_id: string, text: string, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id, text }),
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  } catch {
    throw new ApiError(0, "");
  }
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const retry = Number(res.headers.get("Retry-After") || body.retry_after || 0) || undefined;
    throw new ApiError(res.status, String(body.message || ""), body.code ? String(body.code) : undefined, retry);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const block of parts) {
      let ev = "";
      let data: unknown = {};
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) ev = line.slice(6).trim();
        if (line.startsWith("data:")) {
          try {
            data = JSON.parse(line.slice(5).trim());
          } catch {
            data = {};
          }
        }
      }
      if (ev) yield { event: ev, data } as StreamEvent;
    }
  }
}
