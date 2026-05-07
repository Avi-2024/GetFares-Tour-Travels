import {
  type AxiosError,
  type AxiosResponse,
  isAxiosError,
} from "axios";
import type { IHttpInterceptor } from "../../interfaces/IHttp.interface";
import type { ApiErrorResponse } from "./api-error-response.interface";

class ErrorInterceptor implements IHttpInterceptor {
  public onResponse(response: AxiosResponse): AxiosResponse {
    return response;
  }

  public onResponseError(error: unknown): Promise<never> {
    if (isAxiosError<ApiErrorResponse>(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const apiMessage = axiosError.response?.data?.message;
      const nestedApiMessage = axiosError.response?.data?.error?.message;
      const message =
        apiMessage ||
        nestedApiMessage ||
        axiosError.message ||
        "Something went wrong.";
      return Promise.reject(new Error(message));
    }

    return Promise.reject(
      error instanceof Error ? error : new Error("Unexpected error occurred."),
    );
  }
}

export { ErrorInterceptor };
