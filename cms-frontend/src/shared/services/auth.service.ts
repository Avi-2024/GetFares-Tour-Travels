import { apiConfig } from "../core/api.config";
import type User from "../models/user.model";
import type { IAuthService } from "../interfaces/IAuth.interface";
import type { IHttpClient } from "../interfaces/IHttp.interface";
import type { IApiConfig } from "../interfaces/IApiConfig.interface";
import type {
  IUserStorage,
  ITokenStorage,
} from "../interfaces/IStorage.interface";
import { apiService } from "./api.service";
import { userStorage, tokenStorage } from "./storage.service";

class AuthService implements IAuthService<User> {
  private static instance: AuthService;
  private readonly httpClient: IHttpClient;
  private readonly apiConfig: IApiConfig;
  private readonly userStorage: IUserStorage<User>;
  private readonly tokenStorage: ITokenStorage;

  private constructor(
    httpClient: IHttpClient,
    apiConfig: IApiConfig,
    userStorage: IUserStorage<User>,
    tokenStorage: ITokenStorage,
  ) {
    this.httpClient = httpClient;
    this.apiConfig = apiConfig;
    this.userStorage = userStorage;
    this.tokenStorage = tokenStorage;
  }

  public static getInstance(
    httpClient: IHttpClient = apiService,
    apiConfigService: IApiConfig = apiConfig,
    userStorageService: IUserStorage<User> = userStorage,
    tokenStorageService: ITokenStorage = tokenStorage,
  ): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(
        httpClient,
        apiConfigService,
        userStorageService,
        tokenStorageService,
      );
    }
    return AuthService.instance;
  }

  public async login(
    email: string,
    password: string,
  ): Promise<boolean | string> {
    try {
      const response = await this.httpClient.post<User>(
        this.apiConfig.endpoints.login,
        { email, password },
      );

      this.userStorage.saveUser(response);
      if (response.token) {
        this.tokenStorage.saveToken(response.token);
      }

      return true;
    } catch {
      // Local demo fallback for UI environments without auth API availability.
      if (email === "admin@travel-cms.com" && password === "admin@123") {
        const demoUser: User = {
          name: "CMS Admin",
          email: "admin@travel-cms.com",
          token: "demo-token",
        };

        this.userStorage.saveUser(demoUser);
        this.tokenStorage.saveToken(demoUser.token);
        return true;
      }

      return "Invalid email or password";
    }
  }

  public async logout(): Promise<void> {
    this.tokenStorage.clearToken();
    this.userStorage.clearUser();
  }

  public isAuthenticated(): boolean {
    return this.tokenStorage.loadToken() !== null;
  }

  public getCurrentUser(): User | null {
    return this.userStorage.loadUser();
  }
}

export const authService = AuthService.getInstance();
export { AuthService };
