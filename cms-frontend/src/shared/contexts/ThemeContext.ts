import { createContext } from "react";

export type Theme = "light" | "dark";

export interface IThemeContext {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<IThemeContext>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});
