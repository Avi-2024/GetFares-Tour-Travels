import { createContext } from "react";

export type Theme = "light" | "dark";

export interface IThemeContext {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

class ThemeContextDefaults implements IThemeContext {
  public theme: Theme = "light";
  public toggleTheme(): void {}
  public setTheme(_theme: Theme): void {
    void _theme;
  }
}

export const ThemeContext = createContext<IThemeContext>(
  new ThemeContextDefaults(),
);
