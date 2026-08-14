import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../utils/cn";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 rounded-md border-[3px] border-ink font-display font-bold uppercase tracking-wide transition-[transform,box-shadow,background-color] duration-150 ease-brutal disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-yellow text-ink shadow-brutal-sm hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-[#ffdf70] hover:shadow-none active:translate-x-[5px] active:translate-y-[5px] active:shadow-none",
        secondary:
          "bg-surface text-ink shadow-brutal-sm hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-surface-muted hover:shadow-none active:translate-x-[5px] active:translate-y-[5px] active:shadow-none",
        destructive:
          "bg-red text-ink shadow-brutal-sm hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-[#ff7a7e] hover:shadow-none active:translate-x-[5px] active:translate-y-[5px] active:shadow-none",
        success:
          "bg-green text-ink shadow-brutal-sm hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-[#7ee2a0] hover:shadow-none active:translate-x-[5px] active:translate-y-[5px] active:shadow-none",
        ink: "bg-ink text-paper shadow-brutal-sm hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-[#2a2a2a] hover:shadow-none active:translate-x-[5px] active:translate-y-[5px] active:shadow-none",
        ghost:
          "border-2 bg-transparent text-ink shadow-none hover:bg-yellow active:translate-x-[2px] active:translate-y-[2px]",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-14 px-7 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";