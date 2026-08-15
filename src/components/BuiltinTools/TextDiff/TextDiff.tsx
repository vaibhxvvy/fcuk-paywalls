import { useMemo, useState } from "react";
import { ArrowLeftRight, Copy, Eraser } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { buttonVariants } from "../../ui/button";
import { cn } from "../../../utils/cn";

const MAX_LINES = 1500;

type Op = "same" | "added" | "removed";

function diffLines(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push("same");
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push("removed");
      i++;
    } else {
      ops.push("added");
      j++;
    }
  }
  while (i < n) {
    ops.push("removed");
    i++;
  }
  while (j < m) {
    ops.push("added");
    j++;
  }
  return ops;
}

export function TextDiff() {
  const [aText, setAText] = useState("");
  const [bText, setBText] = useState("");
  const [copied, setCopied] = useState(false);

  const linesA = useMemo(() => aText.split("\n"), [aText]);
  const linesB = useMemo(() => bText.split("\n"), [bText]);
  const truncated = linesA.length > MAX_LINES || linesB.length > MAX_LINES;
  const aCapped = linesA.slice(0, MAX_LINES);
  const bCapped = linesB.slice(0, MAX_LINES);

  const ops = useMemo(() => diffLines(aCapped, bCapped), [aCapped, bCapped]);

  const stats = useMemo(() => {
    const added = ops.filter((o) => o === "added").length;
    const removed = ops.filter((o) => o === "removed").length;
    const same = ops.filter((o) => o === "same").length;
    return { added, removed, same };
  }, [ops]);

  let ai = 0;
  let bi = 0;

  const copy = async () => {
    const out = ops
      .map((op) => {
        const line =
          op === "same" ? aCapped[ai++] : op === "removed" ? aCapped[ai++] : bCapped[bi++];
        return `${op === "same" ? " " : op === "added" ? "+" : "-"} ${line}`;
      })
      .join("\n");
    await navigator.clipboard.writeText(out);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="TEXT-DIFF"
      title="The difference."
      tagline="Two texts, one truth. Side-by-side line diff with added, removed and unchanged — computed locally."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {(
          [
            { label: "[01] Text A", value: aText, set: setAText, bg: "bg-surface-muted", color: "text-ink" },
            { label: "[02] Text B", value: bText, set: setBText, bg: "bg-surface-muted", color: "text-ink" },
          ] as const
        ).map(({ label, value, set, bg, color }) => (
          <section key={label} className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              {label}
            </h2>
            <textarea
              value={value}
              onChange={(e) => set(e.target.value)}
              spellCheck={false}
              className={`mt-4 h-64 w-full resize-y rounded-md border-2 border-ink p-3 font-mono text-xs leading-relaxed outline-none placeholder:text-ink/30 focus:border-yellow ${bg} ${color}`}
              placeholder="Paste one version here…"
            />
          </section>
        ))}
      </div>

      {truncated && (
        <p className="mt-4 rounded-md border-[3px] border-ink bg-yellow p-3 font-mono text-[11px] font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          Files are huge — diffing the first {MAX_LINES.toLocaleString()} lines of each.
        </p>
      )}

      <section className="mt-6 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [03] Diff
          </h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {stats.same} same
            </span>
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-red" />
              {stats.removed} removed
            </span>
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              +{stats.added} added
            </span>
            <button
              type="button"
              onClick={() => void copy()}
              disabled={ops.length === 0}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "uppercase disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy diff"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAText("");
                setBText("");
              }}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "uppercase",
              )}
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-96 overflow-auto rounded-md border-2 border-ink bg-ink">
          <table className="w-full border-collapse font-mono text-[11px] leading-[1.5]">
            <tbody>
              {ops.map((op, idx) => {
                const line = op === "same" ? aCapped[ai++] : op === "removed" ? aCapped[ai++] : bCapped[bi++];
                return (
                  <tr
                    key={idx}
                    className={
                      op === "added"
                        ? "bg-[#0f3d23] text-green"
                        : op === "removed"
                          ? "bg-[#3d0f0f] text-red"
                          : "text-paper/80"
                    }
                  >
                    <td className="select-none px-2 text-right text-paper/30">{ai}</td>
                    <td className="select-none px-2 text-right text-paper/30">{bi}</td>
                    <td className="select-none px-2 text-paper/40">{op === "added" ? "+" : op === "removed" ? "−" : " "}</td>
                    <td className="whitespace-pre-wrap break-all px-2 py-px">{line}</td>
                  </tr>
                );
              })}
              {ops.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-paper/40">
                    Paste two texts to see the difference
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          {ops.length > 0 ? "[ OK ] COMPUTED" : "[ IDLE ] WAITING FOR TWO TEXTS"}
        </p>
      </section>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Classic LCS line diff, computed right in your tab. Your texts never leave.
      </p>
    </ToolShell>
  );
}