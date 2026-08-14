const SkipContentLink = () => {
  return (
    <a
      className="absolute -top-24 left-4 z-[120] rounded-md border-[3px] border-ink bg-yellow px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-ink shadow-brutal-md transition-all duration-150 ease-brutal focus:top-4"
      href="#main-content"
      target="_self"
    >
      Skip to main content
    </a>
  );
};

export default SkipContentLink;