"use client";

import { useTheme } from "@repo/ui/theme";

const presets = [
  { name: "Beyaz", background: "#ffffff", foreground: "#09090b" },
  { name: "Krem", background: "#fafaf5", foreground: "#292524" },
  { name: "Gök", background: "#eff6ff", foreground: "#1e3a8a" },
  { name: "Koyu", background: "#18181b", foreground: "#fafafa" },
];

export function ThemeSwitcher() {
  const { setTokens } = useTheme();

  return (
    <div className="flex items-center justify-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset.name}
          type="button"
          title={preset.name}
          onClick={() => setTokens({ background: preset.background, foreground: preset.foreground })}
          className="h-6 w-6 rounded-full border border-border"
          style={{ backgroundColor: preset.background }}
        />
      ))}
    </div>
  );
}
