"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeTokens = {
  background?: string;
  foreground?: string;
  card?: string;
  cardForeground?: string;
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryForeground?: string;
  muted?: string;
  mutedForeground?: string;
  destructive?: string;
  destructiveForeground?: string;
  border?: string;
  input?: string;
  ring?: string;
  radius?: string;
};

const TOKEN_TO_CSS_VAR: Record<keyof ThemeTokens, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  radius: "--radius",
};

type ThemeContextValue = {
  tokens: ThemeTokens;
  setTokens: (next: ThemeTokens | ((prev: ThemeTokens) => ThemeTokens)) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  defaultTokens = {},
  children,
}: {
  defaultTokens?: ThemeTokens;
  children: ReactNode;
}) {
  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens);

  useEffect(() => {
    const root = document.documentElement;
    for (const key of Object.keys(TOKEN_TO_CSS_VAR) as (keyof ThemeTokens)[]) {
      const cssVar = TOKEN_TO_CSS_VAR[key];
      const value = tokens[key];
      if (value) {
        root.style.setProperty(cssVar, value);
      } else {
        root.style.removeProperty(cssVar);
      }
    }
  }, [tokens]);

  return <ThemeContext.Provider value={{ tokens, setTokens }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme, <ThemeProvider> içinde kullanılmalı.");
  }
  return ctx;
}

/** Tek bir token'ı güncellemek için kısayol, örn. setToken("primary", "#16a34a") */
export function useSetThemeToken() {
  const { setTokens } = useTheme();
  return useCallback(
    (key: keyof ThemeTokens, value: string) => {
      setTokens((prev) => ({ ...prev, [key]: value }));
    },
    [setTokens],
  );
}
