import { useMemo, useState } from "react";
import { ToolShell } from "../shared/ToolShell";
import { cn } from "../../../utils/cn";

const NAMES: Record<number, string> = {
  0: "NUL", 1: "SOH", 2: "STX", 3: "ETX", 4: "EOT", 5: "ENQ", 6: "ACK", 7: "BEL",
  8: "BS", 9: "TAB", 10: "LF", 11: "VT", 12: "FF", 13: "CR", 14: "SO", 15: "SI",
  16: "DLE", 17: "DC1", 18: "DC2", 19: "DC3", 20: "DC4", 21: "NAK", 22: "SYN", 23: "ETB",
  24: "CAN", 25: "EM", 26: "SUB", 27: "ESC", 28: "FS", 29: "GS", 30: "RS", 31: "US",
  32: "SPACE",
  127: "DEL",
};

function displayChar(code: number): string {
  if (code === 32) return "␣";
  if (code === 9) return "→";
  if (code >= 33 && code <= 126) return String.fromCharCode(code);
  if (code >= 160 && code <= 255) return String.fromCharCode(code);
  return "";
}

function htmlEntity(code: number): string {
  return `&#${code};`;
}

export function AsciiTable() {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { dec: number; hex: string; bin: string; char: string; name: string; entity: string }[] = [];
    for (let i = 0; i <= 255; i++) {
      const name = (NAMES[i] ?? "").toLowerCase();
      const char = displayChar(i).toLowerCase();
      if (q && !String(i).includes(q) && !name.includes(q) && !char.includes(q)) continue;
      out.push({
        dec: i,
        hex: i.toString(16).toUpperCase().padStart(2, "0"),
        bin: i.toString(2).padStart(8, "0"),
        char: displayChar(i),
        name: NAMES[i] ?? (i >= 160 ? "extended" : ""),
        entity: htmlEntity(i),
      });
    }
    return out;
  }, [query]);

  const printable = rows.filter((r) => r.char).length;
  const total = rows.length;

  return (
    <ToolShell
      crumb="ASCII-TABLE"
      title="The codex."
      tagline="Every character 0–255 with its hex, binary and HTML entity — the full code book, in your tab."
    >
      <div className="mt-10 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            placeholder="Search by number, name or character…"
            className="min-w-0 flex-1 rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
            {total} hit{total === 1 ? "" : "s"} · {printable} printable
          </p>
        </div>

        <div className="mt-5 max-h-[60vh] overflow-auto rounded-md border-2 border-ink">
          <table className="w-full border-collapse bg-surface">
            <thead className="sticky top-0 z-10 bg-ink">
              <tr>
                {["DEC", "HEX", "BIN", "CHAR", "NAME", "HTML"].map((h) => (
                  <th key={h} className="border-b-2 border-ink px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-paper">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.dec} className={cn("even:bg-surface-muted hover:bg-yellow/25")}>
                  <td className="border-b border-ink/10 px-3 py-1.5 font-mono text-xs font-bold text-ink">{r.dec}</td>
                  <td className="border-b border-ink/10 px-3 py-1.5 font-mono text-xs text-ink/70">0x{r.hex}</td>
                  <td className="border-b border-ink/10 px-3 py-1.5 font-mono text-xs text-ink/70">{r.bin}</td>
                  <td className="border-b border-ink/10 px-3 py-1.5 text-center font-display text-base font-bold text-ink">
                    {r.char || <span className="text-ink/20">·</span>}
                  </td>
                  <td className="border-b border-ink/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase text-ink/60">{r.name}</td>
                  <td className="border-b border-ink/10 px-3 py-1.5 font-mono text-xs text-blue">{r.entity}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/40">
                    No characters match "{query}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        0–127 is ASCII, 128–255 is the extended set — generated locally, no lookup needed.
      </p>
    </ToolShell>
  );
}