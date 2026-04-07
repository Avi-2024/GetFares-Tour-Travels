import { serviceContainer } from "../../shared/core/service.container";
import type { IHttpClient } from "../../shared/interfaces/IHttp.interface";
import type { CmsSectionKey } from "./models/cms-section-key.type";
import { CmsMediaDatasource } from "./data-sources/cms-media.datasource";
import { CmsPayloadMapper } from "./data-sources/cms-payload-mapper";
import { CmsRecordAccessor } from "./data-sources/cms-record-accessor";
import { CmsSectionEntryMapper } from "./data-sources/cms-section-entry.mapper";
import type { CmsMediaAsset } from "./types/cms-media-asset.type";
import type { CmsTableEntry } from "./types/cms-table-entry.type";
import type { DestinationPackageMapping } from "./types/destination-package-mapping.type";
import type { JsonRecord } from "./types/json-record.type";

class CmsDatasource {
  private readonly httpClient: IHttpClient;
  private readonly accessor: CmsRecordAccessor;
  private readonly payloadMapper: CmsPayloadMapper;
  private readonly sectionEntryMapper: CmsSectionEntryMapper;
  private readonly mediaDatasource: CmsMediaDatasource;

  constructor(httpClient: IHttpClient = serviceContainer.getHttpClient()) {
    this.httpClient = httpClient;
    this.accessor = new CmsRecordAccessor();
    this.payloadMapper = new CmsPayloadMapper();
    this.sectionEntryMapper = new CmsSectionEntryMapper(this.httpClient, this.accessor);
    this.mediaDatasource = new CmsMediaDatasource(this.httpClient, this.accessor);
  }

  private getCountryParam(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    const urlCountry = new URLSearchParams(window.location.search).get("country");
    const normalized = (urlCountry || "").trim();
    return normalized || null;
  }

  private getVisaDestinationIdParam(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    const destinationId = new URLSearchParams(window.location.search).get(
      "visaDestinationId",
    );
    const normalized = (destinationId || "").trim();
    return normalized || null;
  }

  private getBooleanQueryParam(key: string): boolean | null {
    if (typeof window === "undefined") {
      return null;
    }

    const rawValue = new URLSearchParams(window.location.search).get(key);
    const normalized = (rawValue || "").trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
    return null;
  }

  private withCountryParams(
    params: Record<string, string | number | boolean> = {},
    options: {
      includeIsActive?: boolean;
    } = {},
  ): { params: Record<string, string | number | boolean> } | undefined {
    const country = this.getCountryParam();
    const isActive =
      options.includeIsActive ? this.getBooleanQueryParam("isActive") : null;
    if (!country && isActive === null && !Object.keys(params).length) {
      return undefined;
    }
    return {
      params: {
        ...(country ? { country } : {}),
        ...(isActive === null ? {} : { isActive }),
        ...params,
      },
    };
  }

  public async list(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    if (sectionKey === "landing-places") {
      const payload = await this.httpClient.get<unknown>(
        "/cms",
        this.withCountryParams(),
      );
      return this.sectionEntryMapper.mapLandingEntries(
        this.accessor.toArray(payload),
        "/cms",
      );
    }

    if (sectionKey === "destinations") {
      const payload = await this.httpClient.get<unknown>(
        "/cms/destinations",
        this.withCountryParams(),
      );
      return this.sectionEntryMapper.mapDestinationEntries(
        this.accessor.toArray(payload),
        "/cms/destinations",
      );
    }

    if (sectionKey === "published-packages") {
      const payload = await this.httpClient.get<unknown>(
        "/cms/packages/published",
        this.withCountryParams(),
      );
      return this.sectionEntryMapper.mapPublishedEntries(this.accessor.toArray(payload));
    }

    if (sectionKey === "main-packages") {
      const payload = await this.httpClient.get<unknown>(
        "/public/cms/packages/main",
        this.withCountryParams(),
      );
      return this.sectionEntryMapper.mapMainPackageEntries(
        this.accessor.toArray(payload),
        "/cms/packages/main",
      );
    }

    if (sectionKey === "sub-packages") {
      return this.sectionEntryMapper.mapSubPackageEntries(
        "/cms/packages/main",
        this.getCountryParam(),
      );
    }

    if (sectionKey === "visa-destinations") {
      const payload = await this.httpClient.get<unknown>(
        "/cms/visa",
        this.withCountryParams({}, { includeIsActive: true }),
      );
      return this.sectionEntryMapper.mapVisaDestinationEntries(
        this.accessor.toArray(payload),
        "/cms/visa",
      );
    }

    if (sectionKey === "visa-details") {
      const visaDestinationId = this.getVisaDestinationIdParam();
      if (visaDestinationId) {
        return this.sectionEntryMapper.mapVisaDetailEntriesByDestination(
          "/cms/visa",
          visaDestinationId,
          this.getCountryParam(),
        );
      }
      return this.sectionEntryMapper.mapVisaDetailEntries(
        "/cms/visa",
        this.getCountryParam(),
      );
    }

    if (sectionKey === "creative-toolkit") {
      const payload = await this.httpClient.get<unknown>(
        "/cms/experience/creative-toolkit",
        this.withCountryParams(),
      );
      return this.sectionEntryMapper.mapFeaturedEntries(
        this.accessor.toArray(payload),
        "/cms/experience",
      );
    }

    if (sectionKey === "destination-map") {
      const payload = await this.httpClient.get<unknown>(
        "/cms/experience/season-cards",
        this.withCountryParams(),
      );
      return this.sectionEntryMapper.mapSeasonCardEntries(
        this.accessor.toArray(payload),
        "/cms/experience",
      );
    }

    throw new Error(`Unsupported section key: ${sectionKey}`);
  }

  public async listAdminMainPackages(): Promise<CmsTableEntry[]> {
    const payload = await this.httpClient.get<unknown>(
      "/cms/packages/main",
      this.withCountryParams(),
    );
    return this.sectionEntryMapper.mapMainPackageEntries(
      this.accessor.toArray(payload),
      "/cms/packages/main",
    );
  }

  public async create(
    sectionKey: CmsSectionKey,
    payload: JsonRecord,
  ): Promise<JsonRecord | null> {
    const mappedPayload = this.payloadMapper.mapForSection(sectionKey, payload);
    const countryOptions = this.withCountryParams();

    if (sectionKey === "landing-places") {
      const response = await this.httpClient.post("/cms", mappedPayload, countryOptions);
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "destinations") {
      const response = await this.httpClient.post(
        "/cms/destinations",
        mappedPayload,
        countryOptions,
      );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "published-packages") {
      const response = await this.httpClient.post(
        "/cms/packages/published",
        mappedPayload,
        countryOptions,
      );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "main-packages") {
      const response = await this.httpClient.post(
        "/cms/packages/main",
        mappedPayload,
        countryOptions,
      );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "sub-packages") {
      const response = await this.httpClient.post(
        "/cms/packages/sub",
        mappedPayload,
        countryOptions,
      );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "visa-destinations") {
      const response = await this.httpClient.post(
        "/cms/visa",
        mappedPayload,
        countryOptions,
      );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "visa-details") {
      const visaDestinationId = String(
        mappedPayload.visaDestinationId ?? mappedPayload.visa_destination_id ?? "",
      );
      if (!visaDestinationId) {
        throw new Error("visaDestinationId is required in payload.");
      }

      const response = await this.httpClient.post(
        `/cms/visa/${visaDestinationId}/details`,
        mappedPayload,
        countryOptions,
      );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "creative-toolkit") {
      const response = await this.httpClient.post(
        "/cms/experience/creative-toolkit",
        mappedPayload,
        countryOptions,
      );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "destination-map") {
      const response = await this.httpClient.post(
        "/cms/experience/season-cards",
        mappedPayload,
        countryOptions,
      );
      return this.accessor.toRecord(response);
    }

    throw new Error("Create is not supported for this section yet.");
  }

  public async update(
    sectionKey: CmsSectionKey,
    entry: CmsTableEntry,
    payload: string | JsonRecord,
  ): Promise<JsonRecord | null> {
    if (!entry.updatePath || entry.readOnly) {
      throw new Error("This row is read-only.");
    }

    const normalizedPayload =
      typeof payload === "string" ?
        this.payloadMapper.mapForSection(sectionKey, {
          [entry.editableField ?? "name"]: payload,
        })
      : this.payloadMapper.mapForSection(sectionKey, payload);
    const countryOptions = this.withCountryParams();

    const response = await this.httpClient.put(
      entry.updatePath,
      normalizedPayload,
      countryOptions,
    );
    return this.accessor.toRecord(response);
  }

  public async remove(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void> {
    if (entry.readOnly) {
      throw new Error("This row is read-only.");
    }
    if (!entry.deletePath) {
      throw new Error("Delete path is unavailable for this row.");
    }

    if (sectionKey === "destinations" || entry.deleteMode === "softDeactivate") {
      await this.httpClient.put(entry.deletePath, { isActive: false });
      return;
    }
    await this.httpClient.delete(entry.deletePath);
  }

  public getMediaEntityType(sectionKey: CmsSectionKey): string {
    return this.mediaDatasource.getMediaEntityType(sectionKey);
  }

  public listMedia(entityType: string, entityId: string): Promise<CmsMediaAsset[]> {
    return this.mediaDatasource.listMedia(entityType, entityId);
  }

  public createMedia(
    entityType: string,
    entityId: string,
    payload: {
      mediaUrl: string;
      title?: string;
      thumbnailUrl?: string;
      mediaKind?: string;
      altText?: string;
      displayOrder?: number;
      isPrimary?: boolean;
    },
  ): Promise<void> {
    return this.mediaDatasource.createMedia(entityType, entityId, payload);
  }

  public updateMedia(
    mediaId: string,
    payload: {
      mediaUrl?: string;
      title?: string;
      thumbnailUrl?: string;
      altText?: string;
      displayOrder?: number;
      isPrimary?: boolean;
      mediaKind?: string;
      isActive?: boolean;
    },
  ): Promise<void> {
    return this.mediaDatasource.updateMedia(mediaId, payload);
  }

  public deleteMedia(mediaId: string): Promise<void> {
    return this.mediaDatasource.deleteMedia(mediaId);
  }

  public uploadMedia(file: File): Promise<string> {
    return this.mediaDatasource.uploadMedia(file);
  }

  public listDestinationPackages(
    destinationId: string,
  ): Promise<DestinationPackageMapping[]> {
    return this.mediaDatasource.listDestinationPackages(destinationId);
  }

  public mapDestinationPackage(
    destinationId: string,
    mainPackageId: string,
    displayOrder: number,
  ): Promise<void> {
    return this.mediaDatasource.mapDestinationPackage(
      destinationId,
      mainPackageId,
      displayOrder,
    );
  }

  public unmapDestinationPackage(
    destinationId: string,
    mappingId: string,
  ): Promise<void> {
    return this.mediaDatasource.unmapDestinationPackage(destinationId, mappingId);
  }
}

const cmsDatasource = new CmsDatasource();

export type { CmsTableEntry } from "./types/cms-table-entry.type";
export type { CmsMediaAsset } from "./types/cms-media-asset.type";
export type { DestinationPackageMapping } from "./types/destination-package-mapping.type";
export { CmsDatasource, cmsDatasource };
