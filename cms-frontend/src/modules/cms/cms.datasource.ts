import { serviceContainer } from "../../shared/core/service.container";
import type { IHttpClient } from "../../shared/interfaces/IHttp.interface";
import type { CmsSectionKey } from "./models/cms-section-key.type";
import { CmsEndpointResolver } from "./data-sources/cms-endpoint-resolver";
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
  private readonly endpointResolver: CmsEndpointResolver;
  private readonly payloadMapper: CmsPayloadMapper;
  private readonly sectionEntryMapper: CmsSectionEntryMapper;
  private readonly mediaDatasource: CmsMediaDatasource;

  constructor(httpClient: IHttpClient = serviceContainer.getHttpClient()) {
    this.httpClient = httpClient;
    this.accessor = new CmsRecordAccessor();
    this.endpointResolver = new CmsEndpointResolver(this.httpClient, this.accessor);
    this.payloadMapper = new CmsPayloadMapper();
    this.sectionEntryMapper = new CmsSectionEntryMapper(this.httpClient, this.accessor);
    this.mediaDatasource = new CmsMediaDatasource(this.httpClient, this.accessor);
  }

  public async list(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    try {
      if (sectionKey === "landing-places") {
        const result = await this.endpointResolver.tryGetFirst([
          "/api/cms/landing-places",
          "/cms/landing-places",
          "/cms",
        ]);
        if (result) {
          return this.sectionEntryMapper.mapLandingEntries(result.data, result.path);
        }
      }

      if (sectionKey === "destinations") {
        const result = await this.endpointResolver.tryGetFirst([
          "/api/cms/destinations",
          "/cms/destinations",
        ]);
        if (result) {
          return this.sectionEntryMapper.mapDestinationEntries(result.data, result.path);
        }
      }

      if (sectionKey === "published-packages") {
        const result = await this.endpointResolver.tryGetFirst([
          "/api/cms/packages/published",
          "/cms/packages/published",
        ]);
        if (result) {
          return this.sectionEntryMapper.mapPublishedEntries(result.data);
        }
      }

      if (sectionKey === "main-packages") {
        const result = await this.endpointResolver.tryGetFirst([
          "/api/cms/packages/main",
          "/cms/packages/main",
        ]);
        if (result) {
          return this.sectionEntryMapper.mapMainPackageEntries(result.data, result.path);
        }
      }

      if (sectionKey === "sub-packages") {
        const result = await this.endpointResolver.tryGetFirst([
          "/api/cms/packages/main",
          "/cms/packages/main",
        ]);
        if (result) {
          return this.sectionEntryMapper.mapSubPackageEntries(result.path);
        }
      }

      if (sectionKey === "visa-destinations") {
        const result = await this.endpointResolver.tryGetFirst([
          "/api/cms/visa-destinations",
          "/cms/visa-destinations",
          "/cms/visa",
        ]);
        if (result) {
          return this.sectionEntryMapper.mapVisaDestinationEntries(result.data, result.path);
        }
      }

      if (sectionKey === "visa-details") {
        const result = await this.endpointResolver.tryGetFirst([
          "/api/cms/visa-destinations",
          "/cms/visa-destinations",
          "/cms/visa",
        ]);
        if (result) {
          return this.sectionEntryMapper.mapVisaDetailEntries(result.path);
        }
      }

      if (sectionKey === "creative-toolkit") {
        const result = await this.endpointResolver.tryGetFirst([
          "/api/cms/experience/featured-picks",
          "/cms/experience/featured-picks",
        ]);
        if (result) {
          const basePath =
            result.path.startsWith("/api/") ?
              "/api/cms/experience"
            : "/cms/experience";
          return this.sectionEntryMapper.mapFeaturedEntries(result.data, basePath);
        }
      }

      if (sectionKey === "destination-map") {
        const result = await this.endpointResolver.tryGetFirst([
          "/api/cms/experience/season-cards",
          "/cms/experience/season-cards",
        ]);
        if (result) {
          const basePath =
            result.path.startsWith("/api/") ?
              "/api/cms/experience"
            : "/cms/experience";
          return this.sectionEntryMapper.mapSeasonCardEntries(result.data, basePath);
        }
      }
    } catch {
      // fallback to static rows when API is unreachable
    }

    return this.sectionEntryMapper.fallbackEntries(sectionKey);
  }

  public async create(
    sectionKey: CmsSectionKey,
    payload: JsonRecord,
  ): Promise<JsonRecord | null> {
    const mappedPayload = this.payloadMapper.mapForSection(sectionKey, payload);

    if (sectionKey === "landing-places") {
      const response = await this.httpClient
        .post("/api/cms/landing-places", mappedPayload)
        .catch(() =>
          this.httpClient.post("/cms/landing-places", mappedPayload).catch(() =>
            this.httpClient.post("/cms", mappedPayload),
          ),
        );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "destinations") {
      const response = await this.httpClient
        .post("/api/cms/destinations", mappedPayload)
        .catch(() => this.httpClient.post("/cms/destinations", mappedPayload));
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "main-packages") {
      const response = await this.httpClient
        .post("/api/cms/packages/main", mappedPayload)
        .catch(() => this.httpClient.post("/cms/packages/main", mappedPayload));
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "sub-packages") {
      const response = await this.httpClient
        .post("/api/cms/packages/sub", mappedPayload)
        .catch(() => this.httpClient.post("/cms/packages/sub", mappedPayload));
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "visa-destinations") {
      const response = await this.httpClient
        .post("/api/cms/visa-destinations", mappedPayload)
        .catch(() =>
          this.httpClient.post("/cms/visa-destinations", mappedPayload).catch(() =>
            this.httpClient.post("/cms/visa", mappedPayload),
          ),
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

      const response = await this.httpClient
        .post(`/api/cms/visa-destinations/${visaDestinationId}/details`, mappedPayload)
        .catch(() =>
          this.httpClient
            .post(`/cms/visa-destinations/${visaDestinationId}/details`, mappedPayload)
            .catch(() =>
              this.httpClient.post(`/cms/visa/${visaDestinationId}/details`, mappedPayload),
            ),
        );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "creative-toolkit") {
      const response = await this.httpClient
        .post("/api/cms/experience/featured-picks", mappedPayload)
        .catch(() =>
          this.httpClient.post("/cms/experience/featured-picks", mappedPayload),
        );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "destination-map") {
      const response = await this.httpClient
        .post("/api/cms/experience/season-cards", mappedPayload)
        .catch(() => this.httpClient.post("/cms/experience/season-cards", mappedPayload));
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

    const response = await this.httpClient.put(entry.updatePath, normalizedPayload);
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
