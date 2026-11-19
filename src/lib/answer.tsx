import { Fragment, type ReactNode } from "react";

// Same rules as renderAnswer/addInline in the current page: paragraphs, bullet and numbered lists,
// **bold** and *bold*. Everything is rendered as text (no HTML from the model ever reaches the page).

const faDigit: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};
const itemNo = (raw: string) => parseInt(raw.replace(/[۰-۹]/g, (d) => faDigit[d]), 10);

export function inline(text: string, keyBase = ""): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const plain = (s: string) => {
    const clean = s.replace(/\*/g, "");
    if (clean) out.push(<Fragment key={`${keyBase}p${k++}`}>{clean}</Fragment>);
  };
  while ((m = re.exec(text))) {
    plain(text.slice(last, m.index));
    out.push(<strong key={`${keyBase}b${k++}`}>{m[1] ?? m[2]}</strong>);
    last = m.index + m[0].length;
  }
  plain(text.slice(last));
  return out;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; start: number; items: { n: number; text: string }[] };

export function blocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  let list: Block | null = null;
  const flush = () => {
    if (para.length) out.push({ kind: "p", lines: para });
    para = [];
  };
  for (const line of lines) {
    const ul = line.match(/^\s*[•\-*]\s+(.*)$/);
    const ol = line.match(/^\s*([0-9۰-۹]+)[.)]\s+(.*)$/);
    if (ul || ol) {
      flush();
      if (ol) {
        if (!list || list.kind !== "ol") {
          list = { kind: "ol", start: itemNo(ol[1]), items: [] };
          out.push(list);
        }
        list.items.push({ n: itemNo(ol[1]), text: ol[2] });
      } else if (ul) {
        if (!list || list.kind !== "ul") {
          list = { kind: "ul", items: [] };
          out.push(list);
        }
        list.items.push(ul[1]);
      }
    } else if (!line.trim()) {
      flush();
      list = null;
    } else {
      list = null;
      para.push(line);
    }
  }
  flush();
  return out;
}

export function Answer({ text }: { text: string }) {
  return (
    <>
      {blocks(text).map((b, i) => {
        if (b.kind === "p")
          return (
            <p key={i}>
              {b.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(line, `${i}.${j}.`)}
                </Fragment>
              ))}
            </p>
          );
        if (b.kind === "ul")
          return (
            <ul key={i}>
              {b.items.map((t, j) => (
                <li key={j}>{inline(t, `${i}.${j}.`)}</li>
              ))}
            </ul>
          );
        return (
          <ol key={i} start={b.start}>
            {b.items.map((it, j) => (
              <li key={j} value={it.n}>
                {inline(it.text, `${i}.${j}.`)}
              </li>
            ))}
          </ol>
        );
      })}
    </>
  );
}
