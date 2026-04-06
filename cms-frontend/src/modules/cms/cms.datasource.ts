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

  public async list(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    if (sectionKey === "landing-places") {
      const payload = await this.httpClient.get<unknown>("/cms");
      return this.sectionEntryMapper.mapLandingEntries(
        this.accessor.toArray(payload),
        "/cms",
      );
    }

    if (sectionKey === "destinations") {
      const payload = await this.httpClient.get<unknown>("/cms/destinations");
      return this.sectionEntryMapper.mapDestinationEntries(
        this.accessor.toArray(payload),
        "/cms/destinations",
      );
    }

    if (sectionKey === "published-packages") {
      const payload = await this.httpClient.get<unknown>("/cms/packages/published");
      return this.sectionEntryMapper.mapPublishedEntries(this.accessor.toArray(payload));
    }

    if (sectionKey === "main-packages") {
      const payload = await this.httpClient.get<unknown>("/cms/packages/main");
      return this.sectionEntryMapper.mapMainPackageEntries(
        this.accessor.toArray(payload),
        "/cms/packages/main",
      );
    }

    if (sectionKey === "sub-packages") {
      return this.sectionEntryMapper.mapSubPackageEntries("/cms/packages/main");
    }

    if (sectionKey === "visa-destinations") {
      const payload = await this.httpClient.get<unknown>("/cms/visa");
      return this.sectionEntryMapper.mapVisaDestinationEntries(
        this.accessor.toArray(payload),
        "/cms/visa",
      );
    }

    if (sectionKey === "visa-details") {
      return this.sectionEntryMapper.mapVisaDetailEntries("/cms/visa");
    }

    if (sectionKey === "creative-toolkit") {
      const payload = await this.httpClient.get<unknown>(
        "/cms/experience/featured-picks",
      );
      return this.sectionEntryMapper.mapFeaturedEntries(
        this.accessor.toArray(payload),
        "/cms/experience",
      );
    }

    if (sectionKey === "destination-map") {
      const payload = await this.httpClient.get<unknown>("/cms/experience/season-cards");
      return this.sectionEntryMapper.mapSeasonCardEntries(
        this.accessor.toArray(payload),
        "/cms/experience",
      );
    }

    throw new Error(`Unsupported section key: ${sectionKey}`);
  }

  public async create(
    sectionKey: CmsSectionKey,
    payload: JsonRecord,
  ): Promise<JsonRecord | null> {
    const mappedPayload = this.payloadMapper.mapForSection(sectionKey, payload);

    if (sectionKey === "landing-places") {
      const response = await this.httpClient.post("/cms", mappedPayload);
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "destinations") {
      const response = await this.httpClient.post("/cms/destinations", mappedPayload);
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "main-packages") {
      const response = await this.httpClient.post("/cms/packages/main", mappedPayload);
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "sub-packages") {
      const response = await this.httpClient.post("/cms/packages/sub", mappedPayload);
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "visa-destinations") {
      const response = await this.httpClient.post("/cms/visa", mappedPayload);
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
      );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "creative-toolkit") {
      const response = await this.httpClient.post(
        "/cms/experience/featured-picks",
        mappedPayload,
      );
      return this.accessor.toRecord(response);
    }

    if (sectionKey === "destination-map") {
      const response = await this.httpClient.post(
        "/cms/experience/season-cards",
        mappedPayload,
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
