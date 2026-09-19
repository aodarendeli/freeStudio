import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
