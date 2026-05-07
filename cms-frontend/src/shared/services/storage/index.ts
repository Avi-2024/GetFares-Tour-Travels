import { ThemeStorageService } from "./theme-storage.service";
import { UserStorageService } from "./user-storage.service";
import { TokenStorageService } from "./token-storage.service";

export const themeStorage = ThemeStorageService.getInstance();
export const userStorage = UserStorageService.getInstance();
export const tokenStorage = TokenStorageService.getInstance();

export { ThemeStorageService } from "./theme-storage.service";
export { UserStorageService } from "./user-storage.service";
export { TokenStorageService } from "./token-storage.service";
