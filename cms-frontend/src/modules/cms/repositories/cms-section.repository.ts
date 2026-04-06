import {
  CmsDatasource,
  type CmsMediaAsset,
  type CmsTableEntry,
  type DestinationPackageMapping,
} from "../cms.datasource";
import type { CmsSectionKey } from "../cms-section.models";
import type { ICmsSectionRepository } from "../interfaces/cms-section.repository.interface";

class CmsSectionRepository implements ICmsSectionRepository {
  private readonly datasource: CmsDatasource;

  constructor(datasource: CmsDatasource = new CmsDatasource()) {
    this.datasource = datasource;
  }

  public list(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    return this.datasource.list(sectionKey);
  }

  public create(
    sectionKey: CmsSectionKey,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    return this.datasource.create(sectionKey, payload);
  }

  public update(
    sectionKey: CmsSectionKey,
    entry: CmsTableEntry,
    payload: Record<string, unknown> | string,
  ): Promise<Record<string, unknown> | null> {
    return this.datasource.update(sectionKey, entry, payload);
  }

  public remove(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void> {
    return this.datasource.remove(sectionKey, entry);
  }

  public getMediaEntityType(sectionKey: CmsSectionKey): string {
    return this.datasource.getMediaEntityType(sectionKey);
  }

  public listMedia(entityType: string, entityId: string): Promise<CmsMediaAsset[]> {
    return this.datasource.listMedia(entityType, entityId);
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
    return this.datasource.createMedia(entityType, entityId, payload);
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
    return this.datasource.updateMedia(mediaId, payload);
  }

  public deleteMedia(mediaId: string): Promise<void> {
    return this.datasource.deleteMedia(mediaId);
  }

  public uploadMedia(file: File): Promise<string> {
    return this.datasource.uploadMedia(file);
  }

  public listDestinationPackages(
    destinationId: string,
  ): Promise<DestinationPackageMapping[]> {
    return this.datasource.listDestinationPackages(destinationId);
  }

  public mapDestinationPackage(
    destinationId: string,
    mainPackageId: string,
    displayOrder: number,
  ): Promise<void> {
    return this.datasource.mapDestinationPackage(
      destinationId,
      mainPackageId,
      displayOrder,
    );
  }

  public unmapDestinationPackage(
    destinationId: string,
    mappingId: string,
  ): Promise<void> {
    return this.datasource.unmapDestinationPackage(destinationId, mappingId);
  }
}

export { CmsSectionRepository };
