export interface IStorage {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
}

export interface IThemeStorage {
  saveTheme(theme: "light" | "dark"): void;
  loadTheme(): "light" | "dark" | null;
}

export interface IUserStorage<T> {
  saveUser(user: T): void;
  loadUser(): T | null;
  clearUser(): void;
}

export interface ITokenStorage {
  saveToken(token: string): void;
  loadToken(): string | null;
  clearToken(): void;
}
