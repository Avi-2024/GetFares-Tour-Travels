import type User from "../models/user.model";
import { IStorage, IThemeStorage, IUserStorage, ITokenStorage } from "../interfaces/IStorage.interface";
import { LocalStorage } from "../core/BaseStorage";

class ThemeStorageService implements IThemeStorage {
  private static instance: ThemeStorageService;
  private readonly THEME_KEY = "theme";
  private readonly storage: IStorage;

  private constructor(storage: IStorage) {
    this.storage = storage;
  }

  public static getInstance(storage: IStorage = LocalStorage.getInstance()): ThemeStorageService {
    if (!ThemeStorageService.instance) {
      ThemeStorageService.instance = new ThemeStorageService(storage);
    }
    return ThemeStorageService.instance;
  }

  public saveTheme(theme: "light" | "dark"): void {
    this.storage.setItem(this.THEME_KEY, theme);
  }

  public loadTheme(): "light" | "dark" | null {
    const theme = this.storage.getItem(this.THEME_KEY);
    if (theme === "light" || theme === "dark") {
      return theme;
    }
    return null;
  }
}

class UserStorageService implements IUserStorage<User> {
  private static instance: UserStorageService;
  private readonly USER_KEY = "user";
  private readonly storage: IStorage;

  private constructor(storage: IStorage) {
    this.storage = storage;
  }

  public static getInstance(storage: IStorage = LocalStorage.getInstance()): UserStorageService {
    if (!UserStorageService.instance) {
      UserStorageService.instance = new UserStorageService(storage);
    }
    return UserStorageService.instance;
  }

  public saveUser(user: User): void {
    this.storage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  public loadUser(): User | null {
    const user = this.storage.getItem(this.USER_KEY);
    if (user) {
      try {
        return JSON.parse(user) as User;
      } catch {
        return null;
      }
    }
    return null;
  }

  public clearUser(): void {
    this.storage.removeItem(this.USER_KEY);
  }
}

class TokenStorageService implements ITokenStorage {
  private static instance: TokenStorageService;
  private readonly TOKEN_KEY = "token";
  private readonly storage: IStorage;

  private constructor(storage: IStorage) {
    this.storage = storage;
  }

  public static getInstance(storage: IStorage = LocalStorage.getInstance()): TokenStorageService {
    if (!TokenStorageService.instance) {
      TokenStorageService.instance = new TokenStorageService(storage);
    }
    return TokenStorageService.instance;
  }

  public saveToken(token: string): void {
    this.storage.setItem(this.TOKEN_KEY, token);
  }

  public loadToken(): string | null {
    return this.storage.getItem(this.TOKEN_KEY);
  }

  public clearToken(): void {
    this.storage.removeItem(this.TOKEN_KEY);
  }
}

export const themeStorage = ThemeStorageService.getInstance();
export const userStorage = UserStorageService.getInstance();
export const tokenStorage = TokenStorageService.getInstance();

export { ThemeStorageService, UserStorageService, TokenStorageService };
