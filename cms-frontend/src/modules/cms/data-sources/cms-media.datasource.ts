import type { IHttpClient } from "../../../shared/interfaces/IHttp.interface";
import type { CmsSectionKey } from "../models/cms-section-key.type";
import type { CmsMediaAsset } from "../types/cms-media-asset.type";
import type { DestinationPackageMapping } from "../types/destination-package-mapping.type";
import { CmsRecordAccessor } from "./cms-record-accessor";

class CmsMediaDatasource {
  private readonly httpClient: IHttpClient;
  private readonly accessor: CmsRecordAccessor;

  constructor(
    httpClient: IHttpClient,
    accessor: CmsRecordAccessor = new CmsRecordAccessor(),
  ) {
    this.httpClient = httpClient;
    this.accessor = accessor;
  }

  public getMediaEntityType(sectionKey: CmsSectionKey): string {
    if (sectionKey === "landing-places") {
      return "landing_place";
    }
    if (sectionKey === "destinations") {
      return "destination";
    }
    if (sectionKey === "published-packages") {
      return "package";
    }
    if (sectionKey === "main-packages") {
      return "main_package";
    }
    if (sectionKey === "sub-packages") {
      return "sub_package";
    }
    if (sectionKey === "visa-destinations") {
      return "visa_destination";
    }
    if (sectionKey === "visa-details") {
      return "visa_detail";
    }
    if (sectionKey === "creative-toolkit") {
      return "featured_pick";
    }
    return "season_card";
  }

  public async listMedia(entityType: string, entityId: string): Promise<CmsMediaAsset[]> {
    const payload = await this.httpClient.get<unknown>(
      `/cms/media?entityType=${entityType}&entityId=${entityId}`,
    );

    return this.accessor.toArray(payload).map((record) => ({
      id: this.accessor.getText(record, "id"),
      entityType: this.accessor.getText(record, "entityType", "entity_type"),
      entityId: this.accessor.getText(record, "entityId", "entity_id"),
      mediaKind: this.accessor.getText(record, "mediaKind", "media_kind"),
      mediaUrl: this.accessor.getText(record, "mediaUrl", "media_url"),
      thumbnailUrl: this.accessor.getText(record, "thumbnailUrl", "thumbnail_url"),
      title: this.accessor.getText(record, "title"),
      altText: this.accessor.getText(record, "altText", "alt_text"),
      displayOrder: this.accessor.getNumber(record, "displayOrder", "display_order") ?? 0,
      isPrimary: this.accessor.getBoolean(record, "isPrimary", "is_primary"),
      isActive: this.accessor.getBoolean(record, "isActive", "is_active"),
    }));
  }

  public async createMedia(
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
    const body = {
      entityType,
      entityId,
      mediaUrl: payload.mediaUrl,
      thumbnailUrl: payload.thumbnailUrl ?? payload.mediaUrl,
      title: payload.title ?? "",
      altText: payload.altText ?? "",
      mediaKind: payload.mediaKind ?? "image",
      isPrimary: payload.isPrimary ?? false,
      displayOrder: payload.displayOrder ?? 0,
    };

    await this.httpClient.post("/cms/media", body);
  }

  public async updateMedia(
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
    await this.httpClient.put(`/cms/media/${mediaId}`, payload);
  }

  public async deleteMedia(mediaId: string): Promise<void> {
    await this.httpClient.delete(`/cms/media/${mediaId}`);
  }

  public async uploadMedia(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("media", file);

    const payload = await this.httpClient.post<unknown>("/cms/media/upload", formData);

    const record = this.accessor.toRecord(payload);
    if (!record) {
      throw new Error("Upload failed: empty response payload.");
    }

    const uploadedUrl = this.accessor.getText(
      record,
      "url",
      "mediaUrl",
      "media_url",
      "fileUrl",
      "file_url",
      "path",
    );

    if (!uploadedUrl || uploadedUrl === "--") {
      throw new Error("Upload failed: media URL not returned by server.");
    }

    return uploadedUrl;
  }

  public async listDestinationPackages(
    destinationId: string,
  ): Promise<DestinationPackageMapping[]> {
    const payload = await this.httpClient.get<unknown>(
      `/cms/destinations/${destinationId}/packages`,
    );

    return this.accessor.toArray(payload).map((record) => ({
      id: this.accessor.getText(record, "id"),
      mainPackageId: this.accessor.getText(record, "mainPackageId", "main_package_id"),
      displayOrder: this.accessor.getNumber(record, "displayOrder", "display_order") ?? 0,
    }));
  }

  public async mapDestinationPackage(
    destinationId: string,
    mainPackageId: string,
    displayOrder: number,
  ): Promise<void> {
    const body = { mainPackageId, displayOrder };
    await this.httpClient.post(`/cms/destinations/${destinationId}/packages`, body);
  }

  public async unmapDestinationPackage(
    destinationId: string,
    mappingId: string,
  ): Promise<void> {
    await this.httpClient.delete(
      `/cms/destinations/${destinationId}/packages/${mappingId}`,
    );
  }
}

export { CmsMediaDatasource };
