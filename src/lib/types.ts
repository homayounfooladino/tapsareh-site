import type { Source, ValidityItem } from "./api";

/** One question and its answer, as shown on the page. */
export interface Turn {
  key: string;
  q: string;
  state: "waiting" | "streaming" | "done" | "error" | "locked";
  stage?: string;
  startedAt?: number;
  text: string;
  sources?: Source[];
  turnId?: number;
  validity?: ValidityItem[];
  lawFrom?: string[];
  error?: string;
  verdict?: "ok" | "wrong" | null;
  past?: boolean; // loaded from history, not answered in this visit
  understood?: string; // #703: how a follow-up was understood (server field understood_as); absent for first questions
  held?: boolean; // asked before sign-in: kept on the page, sent to the server only after sign-in
}
