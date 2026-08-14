import * as React from "react";
import { cn } from "../../utils/cn";

export function DialogOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4",
        className,
      )}
      {...props}
    />
  );
}

export function DialogPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "max-h-[90vh] w-full max-w-[540px] overflow-y-auto rounded-lg border-[3px] border-ink bg-surface p-6 shadow-brutal-xl",
        className,
      )}
      {...props}
    />
  );
}