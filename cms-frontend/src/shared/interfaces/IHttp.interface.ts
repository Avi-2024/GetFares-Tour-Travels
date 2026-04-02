export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type Primitive = string | number | boolean | null | undefined;
export type QueryParams = Record<string, Primitive>;
export type RequestBody = Record<string, unknown> | FormData | unknown[];

export interface IRequestOptions {
  headers?: Record<string, string>;
  params?: QueryParams;
  body?: RequestBody;
  signal?: AbortSignal;
  timeout?: number;
}

export interface IHttpClient {
  get<T>(path: string, options?: IRequestOptions): Promise<T>;
  post<T>(path: string, body?: RequestBody, options?: IRequestOptions): Promise<T>;
  put<T>(path: string, body?: RequestBody, options?: IRequestOptions): Promise<T>;
  patch<T>(path: string, body?: RequestBody, options?: IRequestOptions): Promise<T>;
  delete<T>(path: string, options?: IRequestOptions): Promise<T>;
}

export interface IHttpInterceptor {
  onRequest?(config: any): any;
  onRequestError?(error: unknown): Promise<never>;
  onResponse?(response: any): any;
  onResponseError?(error: unknown): Promise<never>;
}
