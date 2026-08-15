import type { ReactNode } from "react";
import { BrickWall } from "../../decoration/BrickWall";

interface ToolShellProps {
  crumb: string;
  title: string;
  tagline: string;
  note?: string;
  children: ReactNode;
  fill?: boolean;
}

export function ToolShell({ crumb, title, tagline, note, children, fill }: ToolShellProps) {
  if (fill !== false) {
    return (
      <main className="flex h-[calc(100dvh-3.75rem)] min-h-[32rem] flex-col overflow-hidden" id="main-content">
        <div className="shrink-0 px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <div>
              <a
                href="#/tools"
                target="_self"
                className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-yellow/50 hover:shadow-brutal-sm active:translate-x-0 active:translate-y-0 active:shadow-none"
              >
                ← Back to tools
              </a>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/60">
                  INDEX / TOOLS / {crumb}
                </p>
                <h1 className="font-display text-2xl font-bold uppercase leading-none tracking-tight">{title}</h1>
              </div>
            </div>
            <p className="max-w-lg text-[13px] font-medium text-ink/80">{tagline}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6 lg:px-10">{children}</div>
      </main>
    );
  }
  return (
    <main className="py-8" id="main-content">
      <div className="page-container">
        <a
          href="#/tools"
          target="_self"
          className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-yellow/50 hover:shadow-brutal-sm active:translate-x-0 active:translate-y-0 active:shadow-none"
        >
          ← Back to tools
        </a>
        <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
          INDEX / TOOLS / {crumb}
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.5rem,7vw,5rem)] font-bold uppercase leading-[0.95] tracking-tight">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-lg font-medium text-ink/80">{tagline}</p>
        {children}
        {note && (
          <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
            {note}
          </p>
        )}
      </div>
      <BrickWall className="mt-14" />
    </main>
  );
}
