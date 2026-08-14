import { cn } from "../../utils/cn";

interface BrickWallProps {
  className?: string;
  animated?: boolean;
  role?: "presentation" | "img";
  label?: string;
}

export function BrickWall({
  className,
  animated = false,
  role = "presentation",
  label,
}: BrickWallProps) {
  return (
    <div
      role={role}
      aria-label={role === "img" ? label : undefined}
      className={cn("brick-wall h-6 w-full", animated && "brick-strip-animated", className)}
    />
  );
}