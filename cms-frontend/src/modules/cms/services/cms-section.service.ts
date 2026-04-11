import type {
  CmsMediaAsset,
  CmsTableEntry,
  DestinationPackageMapping,
} from "../cms.datasource";
import type { CmsSectionKey } from "../cms-section.models";
import type { ICmsSectionService } from "../interfaces/cms-section.service.interface";
import type { ICmsSectionRepository } from "../interfaces/cms-section.repository.interface";
import { CmsSectionRepository } from "../repositories/cms-section.repository";

class CmsSectionService implements ICmsSectionService {
  private readonly repository: ICmsSectionRepository;

  constructor(repository: ICmsSectionRepository = new CmsSectionRepository()) {
    this.repository = repository;
  }

  public list(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    return this.repository.list(sectionKey);
  }

  public listDeleted(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    return this.repository.listDeleted(sectionKey);
  }

  public listAdminMainPackages(): Promise<CmsTableEntry[]> {
    return this.repository.listAdminMainPackages();
  }

  public create(
    sectionKey: CmsSectionKey,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    return this.repository.create(sectionKey, payload);
  }

  public update(
    sectionKey: CmsSectionKey,
    entry: CmsTableEntry,
    payload: Record<string, unknown> | string,
  ): Promise<Record<string, unknown> | null> {
    return this.repository.update(sectionKey, entry, payload);
  }

  public remove(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void> {
    return this.repository.remove(sectionKey, entry);
  }

  public hardDelete(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void> {
    return this.repository.hardDelete(sectionKey, entry);
  }

  public getMediaEntityType(sectionKey: CmsSectionKey): string {
    return this.repository.getMediaEntityType(sectionKey);
  }

  public listMedia(entityType: string, entityId: string): Promise<CmsMediaAsset[]> {
    return this.repository.listMedia(entityType, entityId);
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
    return this.repository.createMedia(entityType, entityId, payload);
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
    return this.repository.updateMedia(mediaId, payload);
  }

  public deleteMedia(mediaId: string): Promise<void> {
    return this.repository.deleteMedia(mediaId);
  }

  public uploadMedia(file: File): Promise<string> {
    return this.repository.uploadMedia(file);
  }

  public listDestinationPackages(
    destinationId: string,
  ): Promise<DestinationPackageMapping[]> {
    return this.repository.listDestinationPackages(destinationId);
  }

  public mapDestinationPackage(
    destinationId: string,
    mainPackageId: string,
    displayOrder: number,
  ): Promise<void> {
    return this.repository.mapDestinationPackage(
      destinationId,
      mainPackageId,
      displayOrder,
    );
  }

  public unmapDestinationPackage(
    destinationId: string,
    mappingId: string,
  ): Promise<void> {
    return this.repository.unmapDestinationPackage(destinationId, mappingId);
  }
}

export { CmsSectionService };
