export interface IAuthService<T> {
  login(username: string, password: string): Promise<boolean | string>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  getCurrentUser(): T | null;
}
