import { apiConfig } from "../core/api.config";
import type User from "../models/user.model";
import { IAuthService } from "../interfaces/IAuth.interface";
import { IHttpClient } from "../interfaces/IHttp.interface";
import type { IApiConfig } from "../interfaces/IApiConfig.interface";
import { IUserStorage, ITokenStorage } from "../interfaces/IStorage.interface";
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
    tokenStorage: ITokenStorage
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
    tokenStorageService: ITokenStorage = tokenStorage
  ): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(
        httpClient,
        apiConfigService,
        userStorageService,
        tokenStorageService
      );
    }
    return AuthService.instance;
  }

  public async login(
    username: string,
    password: string
  ): Promise<boolean | string> {
    const response: User = await this.httpClient.post(
      this.apiConfig.endpoints.login,
      { username, password },
    );

    this.userStorage.saveUser(response);
    return true;
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
