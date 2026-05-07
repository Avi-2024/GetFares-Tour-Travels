import { Component, type ReactNode } from "react";
import { ThemeContext, type Theme, type IThemeContext } from "./ThemeContext";
import type { IThemeStorage } from "../interfaces/IStorage.interface";
import { themeStorage } from "../services/storage.service";
import { SystemThemeResolver } from "./system-theme.resolver";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storage?: IThemeStorage;
}

interface ThemeProviderState {
  theme: Theme;
}

export class ThemeProvider extends Component<ThemeProviderProps, ThemeProviderState> {
  private readonly themeStorage: IThemeStorage;
  private readonly systemResolver: SystemThemeResolver;
  private isManuallySelected = false;

  constructor(props: ThemeProviderProps) {
    super(props);

    this.themeStorage = props.storage ?? themeStorage;
    this.systemResolver = new SystemThemeResolver();

    const fallbackTheme = props.defaultTheme ?? "light";
    const storedTheme = this.themeStorage.loadTheme();

    this.isManuallySelected = storedTheme !== null;

    this.state = {
      theme: storedTheme ?? this.systemResolver.resolve(fallbackTheme),
    };
  }

  private applyThemeToDocument(theme: Theme): void {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("data-theme", theme);
  }

  private persistTheme(theme: Theme): void {
    this.themeStorage.saveTheme(theme);
    this.isManuallySelected = true;
  }

  private setThemeInternal(theme: Theme, persist: boolean): void {
    this.setState({ theme }, () => {
      this.applyThemeToDocument(theme);
      if (persist) {
        this.persistTheme(theme);
      }
    });
  }

  private handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    if (this.isManuallySelected) {
      return;
    }

    this.setThemeInternal(event.matches ? "dark" : "light", false);
  };

  public toggleTheme = (): void => {
    const nextTheme = this.state.theme === "dark" ? "light" : "dark";
    this.setThemeInternal(nextTheme, true);
  };

  public setTheme = (theme: Theme): void => {
    if (theme !== this.state.theme) {
      this.setThemeInternal(theme, true);
    }
  };

  componentDidMount(): void {
    this.applyThemeToDocument(this.state.theme);

    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", this.handleSystemThemeChange);
    }
  }

  componentWillUnmount(): void {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.removeEventListener("change", this.handleSystemThemeChange);
    }
  }

  render(): ReactNode {
    const contextValue: IThemeContext = {
      theme: this.state.theme,
      toggleTheme: this.toggleTheme,
      setTheme: this.setTheme,
    };

    return <ThemeContext.Provider value={contextValue}>{this.props.children}</ThemeContext.Provider>;
  }
}
