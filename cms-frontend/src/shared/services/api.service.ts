import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  isAxiosError,
} from "axios";
import type { IApiConfig } from "../interfaces/IApiConfig.interface";
import type {
  IHttpClient,
  IHttpInterceptor,
  IRequestOptions,
  RequestBody,
  QueryParams,
} from "../interfaces/IHttp.interface";
import { apiConfig } from "../core/api.config";
import type { ITokenStorage } from "../interfaces/IStorage.interface";
import { tokenStorage } from "./storage.service";

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

class AuthInterceptor implements IHttpInterceptor {
  private readonly tokenStorage: ITokenStorage;

  constructor(tokenStorageService: ITokenStorage = tokenStorage) {
    this.tokenStorage = tokenStorageService;
  }

  public onRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
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

class ErrorInterceptor implements IHttpInterceptor {
  public onResponse(response: AxiosResponse): AxiosResponse {
    return response;
  }

  public onResponseError(error: unknown): Promise<never> {
    if (isAxiosError<ApiErrorResponse>(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const message =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Something went wrong.";
      return Promise.reject(new Error(message));
    }
    return Promise.reject(
      error instanceof Error ? error : new Error("Unexpected error occurred.")
    );
  }
}

class HttpClient implements IHttpClient {
  private static instance: HttpClient;
  private readonly client: AxiosInstance;
  private readonly authInterceptor: AuthInterceptor;
  private readonly errorInterceptor: ErrorInterceptor;

  private constructor(
    baseURL: string,
    timeout: number = 15000,
    authInterceptor: AuthInterceptor = new AuthInterceptor(),
    errorInterceptor: ErrorInterceptor = new ErrorInterceptor()
  ) {
    this.authInterceptor = authInterceptor;
    this.errorInterceptor = errorInterceptor;
    
    this.client = axios.create({
      baseURL,
      withCredentials: true,
      timeout,
      headers: {
        Accept: "application/json",
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(
    apiConfigService: IApiConfig = apiConfig,
    timeout?: number
  ): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient(apiConfigService.baseURL, timeout);
    }
    return HttpClient.instance;
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => this.authInterceptor.onRequest(config),
      (error) => this.authInterceptor.onRequestError(error)
    );

    this.client.interceptors.response.use(
      (response) => this.errorInterceptor.onResponse(response),
      (error) => this.errorInterceptor.onResponseError(error)
    );
  }


  private cleanParams(params?: QueryParams): QueryParams | undefined {
    if (!params) return undefined;
    return Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== null && value !== undefined
      )
    );
  }

  private buildConfig(
    body?: RequestBody,
    options: IRequestOptions = {}
  ): AxiosRequestConfig {
    const resolvedBody = body ?? options.body;
    const isFormData = resolvedBody instanceof FormData;

    return {
      params: this.cleanParams(options.params),
      signal: options.signal,
      timeout: options.timeout,
      headers: {
        ...options.headers,
        ...(resolvedBody !== undefined &&
          !isFormData && {
            "Content-Type": "application/json",
          }),
      },
      data: resolvedBody,
    };
  }

  private async send<T>(
    method: string,
    path: string,
    body?: RequestBody,
    options: IRequestOptions = {}
  ): Promise<T> {
    const config = this.buildConfig(body, options);

    const response = await this.client.request<T>({
      method,
      url: path,
      ...config,
    });

    return response.data;
  }

  public get<T>(path: string, options?: IRequestOptions): Promise<T> {
    return this.send<T>("GET", path, undefined, options);
  }

  public post<T>(
    path: string,
    body?: RequestBody,
    options?: IRequestOptions
  ): Promise<T> {
    return this.send<T>("POST", path, body, options);
  }

  public put<T>(
    path: string,
    body?: RequestBody,
    options?: IRequestOptions
  ): Promise<T> {
    return this.send<T>("PUT", path, body, options);
  }

  public patch<T>(
    path: string,
    body?: RequestBody,
    options?: IRequestOptions
  ): Promise<T> {
    return this.send<T>("PATCH", path, body, options);
  }

  public delete<T>(path: string, options?: IRequestOptions): Promise<T> {
    return this.send<T>("DELETE", path, undefined, options);
  }
}

export const apiService = HttpClient.getInstance();
export { HttpClient, AuthInterceptor, ErrorInterceptor };
