import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../utils/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border-2 border-ink px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        yellow: "bg-yellow text-ink",
        red: "bg-red text-ink",
        blue: "bg-blue text-ink",
        green: "bg-green text-ink",
        ink: "bg-ink text-paper",
        outline: "bg-transparent text-ink",
      },
    },
    defaultVariants: {
      variant: "ink",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}