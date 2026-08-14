import * as React from "react";
import { cn } from "../../utils/cn";

export const selectClass =
  "h-12 w-full cursor-pointer appearance-none rounded-md border-[3px] border-ink bg-surface px-4 pr-10 font-sans text-base text-ink transition-[box-shadow,transform] duration-150 ease-brutal focus:outline-none focus:-translate-x-[2px] focus:-translate-y-[2px] focus:shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-50";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, style, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(selectClass, className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23111111' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 0.75rem center",
      ...style,
    }}
    {...props}
  />
));
Select.displayName = "Select";