import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../utils/cn";

/**
 * Brutalist numbered card section, shared by every tool.
 * Collapsible — controlled via `open`/`onToggle`, or self-managed by default (starts open).
 */
export function SectionCard({
  title,
  icon,
  right,
  count,
  open,
  onToggle,
  children,
}: {
  title: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  count?: number;
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = open ?? internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen((o) => !o));

  return (
    <section className="rounded-lg border-[3px] border-ink bg-surface shadow-brutal-md">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button type="button" onClick={toggle} aria-expanded={isOpen} className="flex items-center gap-2 text-left">
          <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/70">
            {icon}
            {title}
            {count != null && (
              <span className="rounded-sm border-2 border-ink bg-yellow px-1 font-mono text-[9px] font-bold text-ink">
                {count}
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-4 w-4 text-ink/50 transition-transform duration-200 ease-brutal",
              isOpen && "rotate-180",
            )}
          />
        </button>
        {right}
      </div>
      {isOpen && <div className="border-t-2 border-ink/25 px-3 pt-3 pb-3.5">{children}</div>}
    </section>
  );
}
