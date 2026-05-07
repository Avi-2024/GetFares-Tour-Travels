import { apiRequest } from "./apiClient";

export type PushPublicKeyResponse = {
  data: {
    publicKey: string;
  };
};

export type PushSubscribeResponse = {
  data: {
    subscribed: boolean;
  };
};

export const pushApi = {
  publicKey: () => apiRequest<PushPublicKeyResponse>("/api/push/public-key"),
  subscribe: (payload: { subscription: unknown; userAgent?: string }) =>
    apiRequest<PushSubscribeResponse>("/api/push/subscribe", {
      method: "POST",
      body: payload,
    }),
  unsubscribe: (payload: { endpoint: string }) =>
    apiRequest<{ data: { unsubscribed: boolean } }>("/api/push/unsubscribe", {
      method: "POST",
      body: payload,
    }),
};

