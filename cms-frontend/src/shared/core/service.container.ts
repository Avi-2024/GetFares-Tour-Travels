import type { IApiConfig } from "../interfaces/IApiConfig.interface";
import type { IHttpClient } from "../interfaces/IHttp.interface";
import type { IThemeStorage, ITokenStorage, IUserStorage } from "../interfaces/IStorage.interface";
import type User from "../models/user.model";
import { apiConfig } from "./api.config";
import { AuthService } from "../services/auth.service";
import { HttpClient } from "../services/api.service";
import { themeStorage, tokenStorage, userStorage } from "../services/storage.service";

class ServiceContainer {
  private static instance: ServiceContainer;
  private readonly apiConfig: IApiConfig;
  private readonly httpClient: IHttpClient;
  private readonly authService: AuthService;
  private readonly themeStorage: IThemeStorage;
  private readonly userStorage: IUserStorage<User>;
  private readonly tokenStorage: ITokenStorage;

  private constructor(
    apiConfigService: IApiConfig,
    httpClientService: IHttpClient,
    authService: AuthService,
    themeStorageService: IThemeStorage,
    userStorageService: IUserStorage<User>,
    tokenStorageService: ITokenStorage
  ) {
    this.apiConfig = apiConfigService;
    this.httpClient = httpClientService;
    this.authService = authService;
    this.themeStorage = themeStorageService;
    this.userStorage = userStorageService;
    this.tokenStorage = tokenStorageService;
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      const config = apiConfig;
      const client = HttpClient.getInstance(config);
      const auth = AuthService.getInstance(client, config, userStorage, tokenStorage);

      ServiceContainer.instance = new ServiceContainer(
        config,
        client,
        auth,
        themeStorage,
        userStorage,
        tokenStorage
      );
    }
    return ServiceContainer.instance;
  }

  public getApiConfig(): IApiConfig {
    return this.apiConfig;
  }

  public getHttpClient(): IHttpClient {
    return this.httpClient;
  }

  public getAuthService(): AuthService {
    return this.authService;
  }

  public getThemeStorage(): IThemeStorage {
    return this.themeStorage;
  }

  public getUserStorage(): IUserStorage<User> {
    return this.userStorage;
  }

  public getTokenStorage(): ITokenStorage {
    return this.tokenStorage;
  }
}

export const serviceContainer = ServiceContainer.getInstance();
export { ServiceContainer };
