import type { Category, Tool } from "../../../types";
import { cn } from "../../../utils/cn";

interface ToolFiltersProps {
  categories: Category[];
  activeCategory: string;
  searchQuery: string;
  allTools: Tool[];
  filteredCount: number;
  onCategoryChange: (id: string) => void;
  onSearchChange: (q: string) => void;
}

export function ToolFilters({
  categories,
  activeCategory,
  searchQuery,
  allTools,
  filteredCount,
  onCategoryChange,
  onSearchChange,
}: ToolFiltersProps) {
  const counts: Record<string, number> = { all: allTools.length };
  allTools.forEach((t) => {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  });

  return (
    <div className="border-b-4 border-ink bg-surface-muted/60">
      <div className="page-container flex flex-col gap-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tools by name, tag, or description..."
            aria-label="Search tools by name, tag, or description"
            autoComplete="off"
            className="h-11 w-full max-w-sm rounded-md border-[3px] border-ink bg-white px-4 font-sans text-sm placeholder:text-ink/40 transition-[box-shadow,transform] duration-150 ease-brutal focus:outline-none focus:-translate-x-[2px] focus:-translate-y-[2px] focus:shadow-brutal-sm"
          />

          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/70" aria-live="polite">
            SHOWING{" "}
            <span className="text-ink">{String(filteredCount).padStart(3, "0")}</span>{" "}
            OF{" "}
            <span className="text-ink">{String(allTools.length).padStart(3, "0")}</span>{" "}
            TOOLS
          </p>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by category"
        >
          {categories.map((cat) => {
            const isCurrent = cat.id === activeCategory;
            const countNum = counts[cat.id] ?? 0;

            return (
              <button
                key={cat.id}
                type="button"
                className={cn(
                  "inline-flex h-10 select-none items-center gap-2 rounded-md border-2 border-ink bg-surface px-3 font-display text-xs font-bold uppercase tracking-wide transition-[transform,box-shadow,background-color] duration-150 ease-brutal hover:-translate-y-[2px] hover:shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                  isCurrent && "bg-yellow shadow-brutal-sm",
                )}
                data-id={cat.id}
                title={cat.description}
                aria-pressed={isCurrent}
                aria-label={`${cat.name}, ${countNum} tools`}
                onClick={() => onCategoryChange(cat.id)}
              >
                <span aria-hidden="true">{cat.icon}</span>
                {cat.name}
                <span
                  className="font-mono text-[10px] font-semibold text-ink/60"
                  aria-hidden="true"
                >
                  {String(countNum).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}