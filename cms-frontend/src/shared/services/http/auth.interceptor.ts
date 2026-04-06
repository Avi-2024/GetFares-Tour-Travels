import type { InternalAxiosRequestConfig } from "axios";
import type { IHttpInterceptor } from "../../interfaces/IHttp.interface";
import type { ITokenStorage } from "../../interfaces/IStorage.interface";
import { tokenStorage } from "../storage";

class AuthInterceptor implements IHttpInterceptor {
  private readonly tokenStorage: ITokenStorage;

  constructor(tokenStorageService: ITokenStorage = tokenStorage) {
    this.tokenStorage = tokenStorageService;
  }

  public onRequest(
    config: InternalAxiosRequestConfig,
  ): InternalAxiosRequestConfig {
    const token = this.tokenStorage.loadToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }

  public onRequestError(error: unknown): Promise<never> {
    return Promise.reject(error);
  }
}

export { AuthInterceptor };
