import { useEffect, useState } from "react";
import type { ToolSections } from "../../../hooks/useTools";
import type { Category, LoadStatus, Tool } from "../../../types";
import { ToolCard } from "./ToolCard/ToolCard";
import { BrickWall } from "../../decoration/BrickWall";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Button } from "../../ui/button";

interface ToolsProps {
  sections: ToolSections;
  searchKeywords: string[];
  isSearching: boolean;
  categories: Category[];
  loadStatus: LoadStatus;
  errorMessage: string;
  searchQuery: string;
  activeCategory: string;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (id: string) => void;
}

const sectionMeta = {
  featured: { number: "01", label: "Featured" },
  editors: { number: "02", label: "Editor's Picks" },
  meets: { number: "03", label: "Meets Criteria" },
} as const;

export function Tools({
  sections,
  searchKeywords,
  isSearching,
  categories,
  loadStatus,
  errorMessage,
  searchQuery,
  activeCategory,
  setSearchQuery,
  setActiveCategory,
}: ToolsProps) {
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    setShowMore(false);
  }, [searchQuery, activeCategory]);

  if (loadStatus === "loading") {
    return (
      <main className="page-container py-16" id="main-content">
        <div className="mx-auto max-w-lg rounded-lg border-[3px] border-ink bg-surface p-6 shadow-brutal-lg">
          <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
            BREAKING THE WALL<span className="cursor-blink">_</span>
          </p>
          <div className="mt-4 space-y-1.5 font-mono text-xs font-semibold text-ink/60">
            <p>[01] LOCATING INDEX</p>
            <p>[02] FETCHING DATASET</p>
            <p className="text-ink">
              [03] CHECKING ACCESS <span className="cursor-blink">▌</span>
            </p>
          </div>
          <BrickWall animated className="mt-5 h-4" />
        </div>
      </main>
    );
  }

  const { featured, editorsPicks, meetsCriteria } = sections;
  const totalCount =
    featured.length + editorsPicks.length + meetsCriteria.length;

  if (totalCount === 0) {
    return (
      <main className="page-container py-16" id="main-content">
        <div className="mx-auto max-w-xl">
          <h2 className="font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold uppercase leading-[0.95] tracking-tight">
            The wall
            <br />
            won.
          </h2>
          <p className="mt-4 max-w-md text-lg text-ink/80">
            No tools match your search. Try a different term or category — or
            clear the filters and start over.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => setSearchQuery("")}
              className="uppercase"
            >
              Clear search
            </Button>
            <Button
              variant="secondary"
              onClick={() => setActiveCategory("all")}
              className="uppercase"
            >
              All categories
            </Button>
          </div>
          <BrickWall className="mt-8 h-5" />
        </div>
      </main>
    );
  }

  const hasCurated = featured.length > 0 || editorsPicks.length > 0;
  const meetsExpanded = !hasCurated || showMore;

  return (
    <main className="page-container py-12" id="main-content">
      {loadStatus == "error" && (
        <Alert variant="error" className="mb-10">
          <AlertTitle>THE WALL WON.</AlertTitle>
          <AlertDescription>
            Couldn&apos;t reach the live index. {errorMessage}
          </AlertDescription>
          <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/70">
            [ FALLBACK ] Using embedded dataset...
          </p>
        </Alert>
      )}

      <div className="flex flex-col gap-14">
        {featured.length > 0 && (
          <ToolsSection
            meta={sectionMeta.featured}
            tools={featured}
            categories={categories}
            searchKeywords={searchKeywords}
            setSearchQuery={setSearchQuery}
          />
        )}

        {editorsPicks.length > 0 && (
          <ToolsSection
            meta={sectionMeta.editors}
            tools={editorsPicks}
            categories={categories}
            searchKeywords={searchKeywords}
            setSearchQuery={setSearchQuery}
          />
        )}

        {meetsCriteria.length > 0 &&
          (meetsExpanded || isSearching ? (
            <ToolsSection
              meta={sectionMeta.meets}
              tools={meetsCriteria}
              categories={categories}
              searchKeywords={searchKeywords}
              setSearchQuery={setSearchQuery}
            />
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                className="group inline-flex flex-col items-center gap-1 rounded-lg border-[3px] border-ink bg-surface px-8 py-6 shadow-brutal-md transition-[transform,box-shadow] duration-200 ease-brutal hover:-translate-y-1 hover:shadow-brutal-lg active:translate-y-0 active:shadow-brutal-sm"
                onClick={() => setShowMore(true)}
              >
                <strong className="font-display text-xl font-bold uppercase tracking-tight">
                  Show more
                </strong>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                  {meetsCriteria.length} more{" "}
                  {meetsCriteria.length === 1 ? "tool meets" : "tools meet"} the
                  criteria
                </span>
              </button>
            </div>
          ))}
      </div>
    </main>
  );
}

interface ToolsSectionProps {
  meta: (typeof sectionMeta)[keyof typeof sectionMeta];
  tools: Tool[];
  categories: Category[];
  searchKeywords: string[];
  setSearchQuery: (query: string) => void;
}

function ToolsSection({
  meta,
  tools,
  categories,
  searchKeywords,
  setSearchQuery,
}: ToolsSectionProps) {
  return (
    <section aria-label={meta.label}>
      <div className="mb-6 flex items-center gap-3">
        <span className="rounded-md border-2 border-ink bg-ink px-2.5 py-1 font-mono text-xs font-bold text-paper">
          {meta.number}
        </span>
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          {meta.label}
        </h2>
        <span
          aria-hidden="true"
          className="hidden font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/50 sm:inline"
        >
          // {String(tools.length).padStart(2, "0")} BREAKERS
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool, i) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            category={categories.find((c) => c.id === tool.category)}
            searchKeywords={searchKeywords}
            setSearchQuery={setSearchQuery}
            index={i + 1}
          />
        ))}
      </div>
    </section>
  );
}