import { useEffect } from "react";
import { Footer } from "./components/Home/Footer/Footer";
import { Header } from "./components/Home/Header/Header";
import { Hero } from "./components/Home/Hero/Hero";
import { ReportFloatingWidget } from "./components/Home/ReportFloatingWidget/ReportFloatingWidget";
import { ToolFilters } from "./components/Home/ToolFilters/ToolFilters";
import { PaywallPatterns } from "./components/Home/PaywallPatterns/PaywallPatterns";
import { Tools } from "./components/Home/Tools/Tools";
import { BuiltinTools } from "./components/BuiltinTools/BuiltinTools";
import { ScrollToTopButton } from "./components/Shared/Buttons/ScrollToTopButton/ScrollToTopButton";
import SkipContentLink from "./components/Shared/Links/SkipContentLink/SkipContentLink";
import { MODAL_CONFIGS } from "./constants/ModalConfigs";
import { useHashRoute } from "./hooks/useHashRoute";
import { ModalProvider } from "./hooks/useModal";
import { ReportProvider } from "./hooks/useReport";
import { useTools } from "./hooks/useTools";

export default function App() {
  const {
    tools,
    filteredTools,
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
  } = useTools();

  const route = useHashRoute();
  const view: "index" | "tools" = route.startsWith("/tools")
    ? "tools"
    : "index";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <div>
      <ModalProvider modalConfigs={MODAL_CONFIGS}>
        <SkipContentLink />
        <Header
          toolCount={tools.length}
          categoryCount={Math.max(0, categories.length - 1)}
          setSearchQuery={setSearchQuery}
          activeView={view}
        />

        {view === "tools" ? (
          <BuiltinTools route={route} />
        ) : (
          <>
            <Hero searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

            <PaywallPatterns />

            <ToolFilters
              categories={categories}
              activeCategory={activeCategory}
              searchQuery={searchQuery}
              allTools={tools}
              filteredCount={filteredTools.length}
              onCategoryChange={setActiveCategory}
              onSearchChange={setSearchQuery}
            />
            {activeCat && activeCat.id !== "all" && (
              <div className="border-b-4 border-ink bg-ink">
                <div className="page-container flex items-center gap-3 py-3">
                  <span aria-hidden="true" className="text-xl">
                    {activeCat.icon}
                  </span>
                  <span className="font-mono text-sm font-bold uppercase tracking-widest text-paper">
                    [ FILTER ] {activeCat.name}
                  </span>
                </div>
              </div>
            )}

            <ReportProvider>
              <Tools
                sections={sections}
                searchKeywords={searchKeywords}
                isSearching={isSearching}
                categories={categories}
                loadStatus={loadStatus}
                errorMessage={errorMessage}
                searchQuery={searchQuery}
                activeCategory={activeCategory}
                setSearchQuery={setSearchQuery}
                setActiveCategory={setActiveCategory}
              />

              <ReportFloatingWidget />
            </ReportProvider>
          </>
        )}

        <ScrollToTopButton />
        {view !== "tools" && <Footer />}
      </ModalProvider>
    </div>
  );
}