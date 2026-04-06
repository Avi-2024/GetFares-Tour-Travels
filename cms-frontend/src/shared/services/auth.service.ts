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

interface LoginResponsePayload {
  accessToken?: string;
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    role?: string;
    roleId?: string | null;
    isActive?: boolean;
  };
}

interface LoginResponseEnvelope {
  data?: LoginResponsePayload;
}

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
      const response = await this.httpClient.post<LoginResponseEnvelope>(
        this.apiConfig.endpoints.login,
        { email, password },
      );

      const payload = response?.data;
      const accessToken = payload?.accessToken || "";
      const user = payload?.user;

      if (!accessToken || !user?.id || !user?.email || !user?.fullName) {
        return "Invalid login response from server.";
      }

      const normalizedRole = String(user.role || "").trim().toLowerCase();
      if (normalizedRole !== "cms_full_access") {
        return "You do not have CMS access permission.";
      }

      this.userStorage.saveUser({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role || "",
        roleId: user.roleId ?? null,
        isActive: Boolean(user.isActive),
        token: accessToken,
      });
      this.tokenStorage.saveToken(accessToken);
      return true;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid email or password";
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
