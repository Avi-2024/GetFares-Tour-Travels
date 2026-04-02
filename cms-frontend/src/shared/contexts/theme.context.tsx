import { Component, type ReactNode } from "react";
import { ThemeContext, type Theme, type IThemeContext } from "./ThemeContext";
import { type IThemeStorage } from "../interfaces/IStorage.interface";
import { themeStorage } from "../services/storage.service";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

interface ThemeProviderState {
  theme: Theme;
}

export class ThemeProvider extends Component<
  ThemeProviderProps,
  ThemeProviderState
> {
  private readonly themeStorage: IThemeStorage;

  constructor(
    props: ThemeProviderProps,
    themeStorageService: IThemeStorage = themeStorage,
  ) {
    super(props);
    this.themeStorage = themeStorageService;

    const savedTheme = this.loadThemeFromStorage();
    const initialTheme = savedTheme || props.defaultTheme || "light";

    this.state = {
      theme: initialTheme,
    };
  }

  private loadThemeFromStorage(): Theme | null {
    return this.themeStorage.loadTheme();
  }

  private saveThemeToStorage(theme: Theme): void {
    this.themeStorage.saveTheme(theme);
  }

  private applyThemeToDocument(theme: Theme): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.setAttribute("data-theme", theme);
  }

  private updateTheme = (theme: Theme): void => {
    this.setState({ theme }, () => {
      this.saveThemeToStorage(theme);
      this.applyThemeToDocument(theme);
    });
  };

  public toggleTheme = (): void => {
    const newTheme = this.state.theme === "dark" ? "light" : "dark";
    this.updateTheme(newTheme);
  };

  public setTheme = (theme: Theme): void => {
    if (theme !== this.state.theme) {
      this.updateTheme(theme);
    }
  };

  componentDidMount(): void {
    this.applyThemeToDocument(this.state.theme);
  }

  componentDidUpdate(
    _prevProps: ThemeProviderProps,
    prevState: ThemeProviderState,
  ): void {
    if (prevState.theme !== this.state.theme) {
      this.applyThemeToDocument(this.state.theme);
    }
  }

  render(): ReactNode {
    const { children } = this.props;
    const { theme } = this.state;

    const contextValue: IThemeContext = {
      theme,
      toggleTheme: this.toggleTheme,
      setTheme: this.setTheme,
    };

    return (
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
    );
  }
}
