import * as React from "react";
import { cn } from "../../utils/cn";

export const inputClass =
  "h-12 w-full rounded-md border-[3px] border-ink bg-surface px-4 font-sans text-base text-ink placeholder:text-ink/40 transition-[box-shadow,transform] duration-150 ease-brutal focus:outline-none focus:-translate-x-[2px] focus:-translate-y-[2px] focus:shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputClass, className)} {...props} />
));
Input.displayName = "Input";