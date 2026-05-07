import type { Theme } from "./ThemeContext";

class SystemThemeResolver {
  public resolve(defaultTheme: Theme): Theme {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return defaultTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ?
        "dark"
      : "light";
  }
}

export { SystemThemeResolver };
