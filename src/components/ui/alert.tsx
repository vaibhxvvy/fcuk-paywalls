import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../utils/cn";

export const alertVariants = cva(
  "rounded-md border-[3px] border-ink shadow-brutal-sm p-4",
  {
    variants: {
      variant: {
        success: "bg-green",
        error: "bg-red",
        info: "bg-blue",
        warning: "bg-yellow",
      },
    },
    defaultVariants: {
      variant: "warning",
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-mono text-sm font-bold uppercase tracking-wider",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mt-1 text-sm font-medium text-ink/80",
        className,
      )}
      {...props}
    />
  );
}