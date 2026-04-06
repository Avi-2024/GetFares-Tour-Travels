import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { IApiConfig } from "../../interfaces/IApiConfig.interface";
import type {
  IHttpClient,
  IHttpInterceptor,
  IRequestOptions,
  QueryParams,
  RequestBody,
} from "../../interfaces/IHttp.interface";
import { apiConfig } from "../../core/api.config";
import { AuthInterceptor } from "./auth.interceptor";
import { ErrorInterceptor } from "./error.interceptor";

class HttpClient implements IHttpClient {
  private static instance: HttpClient;
  private readonly client: AxiosInstance;
  private readonly authInterceptor: IHttpInterceptor;
  private readonly errorInterceptor: IHttpInterceptor;

  private constructor(
    baseUrl: string,
    timeout = 15000,
    authInterceptor: IHttpInterceptor = new AuthInterceptor(),
    errorInterceptor: IHttpInterceptor = new ErrorInterceptor(),
  ) {
    this.authInterceptor = authInterceptor;
    this.errorInterceptor = errorInterceptor;

    this.client = axios.create({
      baseURL: baseUrl,
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
    timeout?: number,
  ): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient(apiConfigService.baseURL, timeout);
    }
    return HttpClient.instance;
  }

  private setupInterceptors(): void {
    const onRequest = this.authInterceptor.onRequest ?? ((config: unknown) => config);
    const onRequestError =
      this.authInterceptor.onRequestError ??
      ((error: unknown) => Promise.reject(error));
    const onResponse = this.errorInterceptor.onResponse ?? ((response: unknown) => response);
    const onResponseError =
      this.errorInterceptor.onResponseError ??
      ((error: unknown) => Promise.reject(error));

    this.client.interceptors.request.use(
      (config) => onRequest(config),
      (error) => onRequestError(error),
    );
    this.client.interceptors.response.use(
      (response) => onResponse(response),
      (error) => onResponseError(error),
    );
  }

  private cleanParams(params?: QueryParams): QueryParams | undefined {
    if (!params) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );
  }

  private buildConfig(
    body?: RequestBody,
    options: IRequestOptions = {},
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
    options: IRequestOptions = {},
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
    options?: IRequestOptions,
  ): Promise<T> {
    return this.send<T>("POST", path, body, options);
  }

  public put<T>(
    path: string,
    body?: RequestBody,
    options?: IRequestOptions,
  ): Promise<T> {
    return this.send<T>("PUT", path, body, options);
  }

  public patch<T>(
    path: string,
    body?: RequestBody,
    options?: IRequestOptions,
  ): Promise<T> {
    return this.send<T>("PATCH", path, body, options);
  }

  public delete<T>(path: string, options?: IRequestOptions): Promise<T> {
    return this.send<T>("DELETE", path, undefined, options);
  }
}

export { HttpClient };
