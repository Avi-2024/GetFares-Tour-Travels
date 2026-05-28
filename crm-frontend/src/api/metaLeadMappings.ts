import { apiRequest } from "./apiClient";

export type MetaLeadScopeType = "ad" | "form" | "campaign" | "page" | "default";

export type MetaLeadMappableColumn = {
  column: string;
  payloadKey: string;
  label: string;
};

export type MetaLeadFieldMap = {
  id: string;
  profileId: string;
  metaFieldKeys: string[];
  targetColumn: string;
  transform: string;
  stripFromDynamic: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type MetaLeadProfile = {
  id: string;
  name: string;
  scopeType: MetaLeadScopeType;
  scopeId: string;
  priority: number;
  leadType: string | null;
  leadCountry: string | null;
  clientCurrency: string | null;
  sourceLabel: string | null;
  isActive: boolean;
  fieldMaps: MetaLeadFieldMap[];
};

export type MetaLeadMappingMetadata = {
  mappableColumns: MetaLeadMappableColumn[];
  profileDefaultFields: string[];
  formQuestionFields: string[];
  scopeTypes: MetaLeadScopeType[];
  transforms: string[];
  configSource?: string;
};

export type MetaLeadTestMapResult = {
  matchedProfileId: string | null;
  profile: Pick<MetaLeadProfile, "id" | "name" | "scopeType" | "scopeId"> | null;
  mappedPayload: Record<string, unknown>;
  dynamicFields: Record<string, string>;
  dynamicFieldLabels: Record<string, string>;
  profileAssign: {
    leadType?: string | null;
    leadCountry?: string | null;
    clientCurrency?: string | null;
    sourceLabel?: string | null;
  } | null;
};

export type MetaLeadCreateTestResult = {
  leadgenId: string;
  lead: Record<string, unknown> | null;
  duplicate: boolean;
  skipped: boolean;
  reason: string | null;
};

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

export const metaLeadMappingsApi = {
  getMetadata: async () =>
    unwrapData<MetaLeadMappingMetadata>(
      await apiRequest("/api/meta-lead-mappings/metadata"),
    ),

  listProfiles: async (params?: { isActive?: boolean }) => {
    const query =
      params?.isActive === undefined ?
        ""
      : `?isActive=${params.isActive ? "true" : "false"}`;
    return unwrapData<MetaLeadProfile[]>(
      await apiRequest(`/api/meta-lead-mappings/profiles${query}`),
    );
  },

  getProfile: async (id: string) =>
    unwrapData<MetaLeadProfile>(
      await apiRequest(`/api/meta-lead-mappings/profiles/${id}`),
    ),

  createProfile: async (payload: {
    name: string;
    scopeType: MetaLeadScopeType;
    scopeId?: string;
    priority?: number;
    leadType?: string | null;
    leadCountry?: string | null;
    clientCurrency?: string | null;
    sourceLabel?: string | null;
    isActive?: boolean;
  }) =>
    unwrapData<MetaLeadProfile>(
      await apiRequest("/api/meta-lead-mappings/profiles", {
        method: "POST",
        body: payload,
      }),
    ),

  updateProfile: async (
    id: string,
    payload: Partial<{
      name: string;
      scopeType: MetaLeadScopeType;
      scopeId: string;
      priority: number;
      leadType: string | null;
      leadCountry: string | null;
      clientCurrency: string | null;
      sourceLabel: string | null;
      isActive: boolean;
    }>,
  ) =>
    unwrapData<MetaLeadProfile>(
      await apiRequest(`/api/meta-lead-mappings/profiles/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    ),

  createFieldMap: async (
    profileId: string,
    payload: {
      metaFieldKeys: string[];
      targetColumn: string;
      transform?: string;
      stripFromDynamic?: boolean;
      sortOrder?: number;
    },
  ) =>
    unwrapData<MetaLeadFieldMap>(
      await apiRequest(
        `/api/meta-lead-mappings/profiles/${profileId}/field-maps`,
        { method: "POST", body: payload },
      ),
    ),

  updateFieldMap: async (
    id: string,
    payload: Partial<{
      metaFieldKeys: string[];
      targetColumn: string;
      transform: string;
      stripFromDynamic: boolean;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) =>
    unwrapData<MetaLeadFieldMap>(
      await apiRequest(`/api/meta-lead-mappings/field-maps/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    ),

  deleteFieldMap: async (id: string) =>
    unwrapData<{ id: string; deleted: boolean }>(
      await apiRequest(`/api/meta-lead-mappings/field-maps/${id}`, {
        method: "DELETE",
      }),
    ),

  testMapping: async (payload: {
    fieldData: Array<{ name: string; values?: string[]; value?: string }>;
    metaAdId?: string;
    metaFormId?: string;
    metaCampaignId?: string;
    metaPageId?: string;
  }) =>
    unwrapData<MetaLeadTestMapResult>(
      await apiRequest("/api/meta-lead-mappings/test", {
        method: "POST",
        body: payload,
      }),
    ),

  createTestLead: async (payload: {
    fieldData: Array<{ name: string; values?: string[]; value?: string }>;
    metaPageId: string;
    metaAdId?: string;
    metaFormId?: string;
    metaCampaignId?: string;
    leadgenId?: string;
  }) =>
    unwrapData<MetaLeadCreateTestResult>(
      await apiRequest("/api/meta-lead-mappings/test/create-lead", {
        method: "POST",
        body: payload,
      }),
    ),

  reloadCache: async () =>
    unwrapData<{ reloaded: boolean; profileCount: number }>(
      await apiRequest("/api/meta-lead-mappings/reload-cache", {
        method: "POST",
      }),
    ),
};
