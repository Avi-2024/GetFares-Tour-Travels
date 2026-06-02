import { apiRequest } from "./apiClient";

export type SecretFieldStatus = {
  configured: boolean;
  confirmed: boolean;
};

export type MetaPageSecrets = {
  accessToken: SecretFieldStatus;
  appSecret: SecretFieldStatus;
  verifyToken: SecretFieldStatus;
};

export type MetaPageConfig = {
  id: string;
  pageId: string;
  pageName: string | null;
  accountName: string | null;
  countryId: string | null;
  countryCode: string | null;
  countryName: string | null;
  sourceLabel: string;
  graphVersion: string | null;
  graphBaseUrl: string | null;
  graphFields: string | null;
  isActive: boolean;
  secretsConfirmedAt: string | null;
  secrets: MetaPageSecrets;
  updatedAt?: string | null;
};

export type MetaIntegrationSettings = {
  graphBaseUrl: string | null;
  graphVersion: string | null;
  graphFields: string | null;
  allowInsecureWebhooks: boolean;
  secretsConfirmedAt: string | null;
  secrets: {
    appSecret: SecretFieldStatus;
    verifyToken: SecretFieldStatus;
  };
  configSource?: string;
};

export type MetaPageConfigInput = {
  pageId?: string;
  pageName?: string | null;
  accountName?: string | null;
  countryId?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  sourceLabel?: string;
  accessToken?: string;
  appSecret?: string;
  verifyToken?: string;
  graphVersion?: string | null;
  graphBaseUrl?: string | null;
  graphFields?: string | null;
  isActive?: boolean;
  confirmSecrets?: boolean;
};

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

export const metaConnectionApi = {
  getIntegration: async () =>
    unwrapData<MetaIntegrationSettings>(
      await apiRequest("/api/meta-connection/integration"),
    ),

  updateIntegration: async (body: Partial<MetaPageConfigInput> & {
    allowInsecureWebhooks?: boolean;
  }) =>
    unwrapData<MetaIntegrationSettings>(
      await apiRequest("/api/meta-connection/integration", {
        method: "PATCH",
        body,
      }),
    ),

  listPages: async (params?: { isActive?: boolean }) => {
    const query =
      params?.isActive === undefined ?
        ""
      : `?isActive=${params.isActive ? "true" : "false"}`;
    return unwrapData<MetaPageConfig[]>(
      await apiRequest(`/api/meta-connection/pages${query}`),
    );
  },

  getPage: async (id: string) =>
    unwrapData<MetaPageConfig>(
      await apiRequest(`/api/meta-connection/pages/${id}`),
    ),

  createPage: async (body: MetaPageConfigInput & { pageId: string; sourceLabel: string }) =>
    unwrapData<MetaPageConfig>(
      await apiRequest("/api/meta-connection/pages", {
        method: "POST",
        body,
      }),
    ),

  updatePage: async (id: string, body: MetaPageConfigInput) =>
    unwrapData<MetaPageConfig>(
      await apiRequest(`/api/meta-connection/pages/${id}`, {
        method: "PATCH",
        body,
      }),
    ),

  deletePage: async (id: string) =>
    unwrapData<{ deleted: boolean; id: string }>(
      await apiRequest(`/api/meta-connection/pages/${id}`, {
        method: "DELETE",
      }),
    ),
};
