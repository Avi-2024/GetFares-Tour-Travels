import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  isAxiosError,
} from "axios";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Primitive = string | number | boolean | null | undefined;
type QueryParams = Record<string, Primitive>;
type RequestBody = Record<string, unknown> | FormData | unknown[];
interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}
interface RequestOptions {
  headers?: Record<string, string>;
  params?: QueryParams;
  body?: RequestBody;
  signal?: AbortSignal;
  timeout?: number;
}

class ApiService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
      withCredentials: true,
      timeout: 15000,
      headers: {
        Accept: "application/json",
      },
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAuthToken();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error: unknown) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: unknown) => {
        if (isAxiosError<ApiErrorResponse>(error)) {
          const axiosError = error as AxiosError<ApiErrorResponse>;

          const message =
            axiosError.response?.data?.message ||
            axiosError.message ||
            "Something went wrong.";

          return Promise.reject(new Error(message));
        }

        return Promise.reject(
          error instanceof Error ? error : (
            new Error("Unexpected error occurred.")
          ),
        );
      },
    );
  }

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;

    return localStorage.getItem("token");
  }

  private cleanParams(params?: QueryParams): QueryParams | undefined {
    if (!params) return undefined;

    return Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );
  }

  private buildConfig(
    body?: RequestBody,
    options: RequestOptions = {},
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
    method: HttpMethod,
    path: string,
    body?: RequestBody,
    options: RequestOptions = {},
  ): Promise<T> {
    const config = this.buildConfig(body, options);

    const response = await this.client.request<T>({
      method,
      url: path,
      ...config,
    });

    return response.data;
  }

  public get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.send<T>("GET", path, undefined, options);
  }

  public post<T>(
    path: string,
    body?: RequestBody,
    options?: RequestOptions,
  ): Promise<T> {
    return this.send<T>("POST", path, body, options);
  }

  public put<T>(
    path: string,
    body?: RequestBody,
    options?: RequestOptions,
  ): Promise<T> {
    return this.send<T>("PUT", path, body, options);
  }

  public patch<T>(
    path: string,
    body?: RequestBody,
    options?: RequestOptions,
  ): Promise<T> {
    return this.send<T>("PATCH", path, body, options);
  }

  public delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.send<T>("DELETE", path, undefined, options);
  }
}

const apiService = new ApiService();

export default apiService;
