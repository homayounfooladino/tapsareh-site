import type { Source, ValidityItem } from "./api";

/** One question and its answer, as shown on the page. */
export interface Turn {
  key: string;
  q: string;
  state: "waiting" | "streaming" | "done" | "error";
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
}
