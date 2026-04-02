import { useContext } from "react";
import { ThemeContext, type IThemeContext } from "../contexts/ThemeContext";

/**
 * Custom hook to use theme context
 * For functional components
 */
export function useTheme(): IThemeContext {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
