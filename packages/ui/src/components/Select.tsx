import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
