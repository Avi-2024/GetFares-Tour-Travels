import type { IStorage, IThemeStorage } from "../../interfaces/IStorage.interface";
import { LocalStorageService } from "../../core/storage/local-storage.service";

class ThemeStorageService implements IThemeStorage {
  private static instance: ThemeStorageService;
  private readonly themeKey = "theme";
  private readonly storage: IStorage;

  private constructor(storage: IStorage) {
    this.storage = storage;
  }

  public static getInstance(
    storage: IStorage = LocalStorageService.getInstance(),
  ): ThemeStorageService {
    if (!ThemeStorageService.instance) {
      ThemeStorageService.instance = new ThemeStorageService(storage);
    }
    return ThemeStorageService.instance;
  }

  public saveTheme(theme: "light" | "dark"): void {
    this.storage.setItem(this.themeKey, theme);
  }

  public loadTheme(): "light" | "dark" | null {
    const theme = this.storage.getItem(this.themeKey);
    if (theme === "light" || theme === "dark") {
      return theme;
    }
    return null;
  }
}

export { ThemeStorageService };
