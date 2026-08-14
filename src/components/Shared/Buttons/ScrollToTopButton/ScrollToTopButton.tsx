import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameId: number | null = null;
    let lastVisibleState = false;

    function updateVisibility() {
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const clientHeight = document.documentElement.clientHeight;
      const viewportHeight = window.innerHeight || clientHeight || 0;
      const threshold = Math.max(2000, viewportHeight * 0.1);
      const nextVisible = scrollTop > threshold;

      if (nextVisible !== lastVisibleState) {
        lastVisibleState = nextVisible;
        setIsVisible(nextVisible);
      }

      frameId = null;
    }

    function handleScroll() {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(updateVisibility);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      className="fixed bottom-4 left-4 z-[90] flex h-12 w-12 items-center justify-center rounded-md border-[3px] border-ink bg-surface text-ink shadow-brutal-md transition-[transform,box-shadow] duration-150 ease-brutal hover:-translate-y-[2px] hover:shadow-brutal-lg active:translate-y-0 active:shadow-brutal-sm"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}