import type User from "../models/user.model";

class StorageService {
  public _setItem(key: string, value: string) {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(key, value);
  }

  public _getItem(key: string) {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem(key);
  }

  public theme = {
    _setTheme: (theme: "light" | "dark"): void => {
      this._setItem("theme", theme);
    },
    _getTheme: () => {
      const theme = this._getItem("theme");
      if (theme === "light" || theme === "dark") {
        return theme;
      }
      return null;
    },
  };

  public user = {
    _setUser: (user: User): void => {
      this._setItem("user", JSON.stringify(user));
    },
    _getUser: (): User | null => {
      const user = this._getItem("user");
      if (user) {
        return JSON.parse(user);
      }
      return null;
    },
  };
}

export default new StorageService();
