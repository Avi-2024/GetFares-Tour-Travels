// New clean API structure (recommended)
export * from './core';
export * from './endpoints';
export * from './services';
export * from './hooks';
export * from './types';

// Legacy exports (deprecated - will be removed)
export { apiRequest, createApiError, isApiError, getApiErrorMessage, API_BASE_URL } from "./apiClient";
export type { ApiError, ApiRequestConfig, ApiClientConfig, ApiClient } from "./apiClient";
export * from "./auth";
export * from "./users";
export * from "./leads";
export * from "./quotations";
export * from "./bookings";
export * from "./payments";
export * from "./refunds";
export * from "./visa";
export * from "./campaigns";
export * from "./destinations";
export * from "./countries";
export * from "./customers";
export * from "./suppliers";
export * from "./complaints";
export * from "./reports";
export * from "./notifications";
export * from "./settings";
