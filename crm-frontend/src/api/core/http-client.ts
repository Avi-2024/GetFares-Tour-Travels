import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  token?: string;
}

export class HttpClient {
  private instance: AxiosInstance;
  private tokenProvider: (() => string | null) | null = null;
  private onUnauthorized: (() => void) | null = null;

  constructor(config: HttpClientConfig) {
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 20000,
      headers: { 'Content-Type': 'application/json', ...config.headers },
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use((config) => {
      const token = (config as RequestConfig).token || this.tokenProvider?.();
      const skipAuth = (config as RequestConfig).skipAuth;
      if (token && !skipAuth) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && this.onUnauthorized) this.onUnauthorized();
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private normalizeError(error: any) {
    if (axios.isAxiosError(error)) {
      return {
        message: error.response?.data?.error?.message || error.response?.data?.message || error.message,
        status: error.response?.status || 0,
        data: error.response?.data,
      };
    }
    return { message: 'Unknown error', status: 0 };
  }

  setTokenProvider(provider: () => string | null) { this.tokenProvider = provider; }
  setUnauthorizedHandler(handler: () => void) { this.onUnauthorized = handler; }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }
}
