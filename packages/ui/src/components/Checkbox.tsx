import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border border-input text-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
