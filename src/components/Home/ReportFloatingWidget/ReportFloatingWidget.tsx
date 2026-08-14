import { useState } from "react";
import { ChatIcon } from "../../../constants/icons";
import { useModal } from "../../../hooks/useModal";
import { useReport } from "../../../hooks/useReport";
import { Toast } from "../../Shared/Feedback/Toast/Toast";
import { cn } from "../../../utils/cn";

export function ReportFloatingWidget() {
  const { reportMode, setReportMode } = useReport();
  const [clicked, setClicked] = useState(false);

  return (
    <>
      {reportMode && (
        <Toast
          innerText="Select an entry to report"
          onExit={() => setReportMode(false)}
        />
      )}

      <div className="fixed right-4 bottom-4 z-[90] flex flex-col items-end gap-3">
        {clicked && <FeedbackMenu />}
        <FeedbackButton clicked={clicked} setClicked={setClicked} />
      </div>
    </>
  );
}

function FeedbackButton({
  clicked,
  setClicked,
}: {
  clicked: boolean;
  setClicked: (clickedStatus: boolean) => void;
}) {
  const label = "Report or suggest a tool";

  return (
    <button
      onClick={() => setClicked(!clicked)}
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-ink bg-red text-ink shadow-brutal-md transition-[transform,box-shadow] duration-150 ease-brutal hover:-translate-y-[2px] hover:shadow-brutal-lg active:translate-y-0 active:shadow-brutal-sm",
        clicked && "shadow-none",
      )}
      aria-label={label}
      title={label}
      aria-haspopup="menu"
      aria-expanded={clicked}
    >
      <ChatIcon className="h-6 w-6" />
    </button>
  );
}

function FeedbackMenu() {
  const { reportMode, setReportMode } = useReport();
  const { showModalWithID } = useModal();

  return (
    <ul
      role="menu"
      className="flex w-64 flex-col gap-2 rounded-lg border-[3px] border-ink bg-surface p-3 shadow-brutal-lg"
    >
      <li role="none">
        <button
          type="button"
          role="menuitem"
          className={cn(
            "w-full cursor-pointer rounded-md border-2 border-ink bg-surface px-3 py-2.5 text-left font-display text-xs font-bold uppercase tracking-wide transition-[background-color,box-shadow] duration-150 ease-brutal hover:bg-yellow",
            reportMode && "bg-yellow shadow-brutal-sm",
          )}
          onClick={() => setReportMode(!reportMode)}
        >
          Report an entry
        </button>
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          className="w-full cursor-pointer rounded-md border-2 border-ink bg-surface px-3 py-2.5 text-left font-display text-xs font-bold uppercase tracking-wide transition-[background-color] duration-150 ease-brutal hover:bg-yellow"
          onClick={() => showModalWithID("suggest-tool")}
        >
          Suggest a tool for us to make
        </button>
      </li>
    </ul>
  );
}