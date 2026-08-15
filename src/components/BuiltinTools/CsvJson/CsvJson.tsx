import { useMemo, useState } from "react";
import { ArrowDownUp, Copy, FileJson2, Table2 } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const SAMPLE_CSV = `name,role,tools
Vaibhav,walls cracker,234
The FCUKer,no signups,0
The Intern,canvas guard,1`;

function cellsOf(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else if (ch === "\r") {
      // skip
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function csvToJson(csv: string): { ok: true; data: unknown } | { ok: false; error: string } {
  const lines = csv.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { ok: false, error: "CSV NEEDS A HEADER ROW PLUS AT LEAST ONE DATA ROW" };
  const headers = cellsOf(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = cellsOf(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx]?.trim() ?? "";
    });
    rows.push(row);
  }
  return { ok: true, data: rows };
}

function escapeCell(cell: string): string {
  if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function jsonToCsv(json: string): { ok: true; data: string } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: `INVALID JSON — ${(e as Error).message}` };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, error: "JSON MUST BE A NON-EMPTY ARRAY OF OBJECTS" };
  }
  if (parsed.some((r) => r === null || typeof r !== "object" || Array.isArray(r))) {
    return { ok: false, error: "EVERY ROW MUST BE AN OBJECT" };
  }
  const headers = [...new Set(parsed.flatMap((r) => Object.keys(r as object)))];
  const rows = (parsed as Record<string, unknown>[]).map((r) =>
    headers.map((h) => escapeCell(String(r[h] ?? ""))).join(","),
  );
  return { ok: true, data: [headers.join(","), ...rows].join("\n") };
}

export function CsvJson() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"csv" | "json">("csv");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    if (!output) return null;
    try {
      const rows = output.split("\n").filter((l) => l.trim()).length;
      return mode === "csv" ? { rows, cols: cellsOf(output.split("\n")[0]).length } : null;
    } catch {
      return null;
    }
  }, [output, mode]);

  const run = () => {
    setError(null);
    if (mode === "csv") {
      const res = csvToJson(input);
      if (res.ok) {
        setOutput(JSON.stringify(res.data, null, 2));
      } else {
        setOutput("");
        setError(res.error);
      }
    } else {
      const res = jsonToCsv(input);
      if (res.ok) {
        setOutput(res.data);
      } else {
        setOutput("");
        setError(res.error);
      }
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="CSV-JSON"
      title="The translator."
      tagline="CSV ⇄ JSON, both directions, fully in your tab. Quoted fields, commas, the works."
    >
      <div className="mt-10 flex flex-wrap gap-2">
        {(
          [
            ["csv", "CSV → JSON", "Convert a table into an array of objects"],
            ["json", "JSON → CSV", "Flatten an array of objects into a table"],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setOutput("");
              setError(null);
            }}
            title={hint}
            className={cn(
              "rounded-md border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
              mode === value ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
            )}
          >
            {label}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto uppercase"
          onClick={() => {
            setInput(mode === "csv" ? SAMPLE_CSV : JSON.stringify([
              { name: "Vaibhav", role: "walls cracker", tools: 234 },
              { name: "The FCUKer", role: "no signups", tools: 0 },
            ], null, 2));
            setOutput("");
            setError(null);
          }}
        >
          Sample
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] {mode === "csv" ? "CSV in" : "JSON in"}
            {mode === "csv" ? <Table2 className="h-4 w-4" aria-hidden="true" /> : <FileJson2 className="h-4 w-4" aria-hidden="true" />}
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={mode === "csv" ? "a,b,c\n1,2,3" : '[{"a":1,"b":2,"c":3}]'}
            className="mt-4 h-72 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <Button size="sm" onClick={run} className="mt-3 uppercase" disabled={!input}>
            <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
            Convert
          </Button>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] {mode === "csv" ? "JSON out" : "CSV out"}
            {mode === "csv" ? <FileJson2 className="h-4 w-4" aria-hidden="true" /> : <Table2 className="h-4 w-4" aria-hidden="true" />}
          </h2>
          <textarea
            readOnly
            value={output}
            spellCheck={false}
            placeholder="Result lands here…"
            className="mt-4 h-72 w-full resize-y rounded-md border-2 border-ink bg-ink p-3 font-mono text-xs leading-relaxed text-green outline-none placeholder:text-paper/30"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
              disabled={!output}
              className="uppercase"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                  error ? "bg-red" : output ? "bg-green" : "bg-ink/20",
                )}
              />
              {error
                ? "[ ERR ] INVALID INPUT"
                : stats
                  ? `[ OK ] ${stats.rows} ROWS × ${stats.cols} COLS`
                  : "[ IDLE ] WAITING FOR INPUT"}
            </span>
          </div>
        </section>
      </div>

      {error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          {error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Hand-rolled CSV parser — quoted fields, escaped quotes, commas in cells. All local.
      </p>
    </ToolShell>
  );
}