import type { ReactNode } from "react";
import { BrickWall } from "../../decoration/BrickWall";

interface ToolShellProps {
  crumb: string;
  title: string;
  tagline: string;
  note?: string;
  children: ReactNode;
}

export function ToolShell({ crumb, title, tagline, note, children }: ToolShellProps) {
  return (
    <main className="py-12" id="main-content">
      <div className="page-container">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
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
