import { X } from "lucide-react";

interface ToastProps {
  innerText: string;
  onExit: () => void;
}

export function Toast({ innerText, onExit }: ToastProps) {
  return (
    <div
      className="fixed top-4 left-1/2 z-[110] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-md border-[3px] border-ink bg-yellow px-4 py-3 shadow-brutal-md"
      role="status"
    >
      <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
        {innerText}
      </p>
      <button
        type="button"
        onClick={onExit}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-sm border-2 border-ink bg-surface transition-transform duration-100 ease-brutal active:translate-x-[2px] active:translate-y-[2px]"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}