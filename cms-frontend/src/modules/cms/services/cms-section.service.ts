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
  private readonly cache = new Map<string, CmsTableEntry[]>();

  constructor(repository: ICmsSectionRepository = new CmsSectionRepository()) {
    this.repository = repository;
  }

  private invalidate(sectionKey: CmsSectionKey): void {
    this.cache.delete(sectionKey);
    // also invalidate admin main packages cache used by sub-packages
    if (sectionKey === "main-packages" || sectionKey === "sub-packages") {
      this.cache.delete("__adminMainPackages");
    }
  }

  public async list(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    if (this.cache.has(sectionKey)) {
      return this.cache.get(sectionKey)!;
    }
    const data = await this.repository.list(sectionKey);
    this.cache.set(sectionKey, data);
    return data;
  }

  public async listWithCacheBust(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    this.invalidate(sectionKey);
    return this.list(sectionKey);
  }

  public async listDeleted(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    return this.repository.listDeleted(sectionKey);
  }

  public async listAdminMainPackages(): Promise<CmsTableEntry[]> {
    const key = "__adminMainPackages";
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const data = await this.repository.listAdminMainPackages();
    this.cache.set(key, data);
    return data;
  }

  public async create(
    sectionKey: CmsSectionKey,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const result = await this.repository.create(sectionKey, payload);
    this.invalidate(sectionKey);
    return result;
  }

  public async update(
    sectionKey: CmsSectionKey,
    entry: CmsTableEntry,
    payload: Record<string, unknown> | string,
  ): Promise<Record<string, unknown> | null> {
    const result = await this.repository.update(sectionKey, entry, payload);
    this.invalidate(sectionKey);
    return result;
  }

  public async remove(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void> {
    await this.repository.remove(sectionKey, entry);
    this.invalidate(sectionKey);
  }

  public async hardDelete(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void> {
    await this.repository.hardDelete(sectionKey, entry);
    this.invalidate(sectionKey);
  }

  public async restore(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void> {
    await this.repository.restore(sectionKey, entry);
    this.invalidate(sectionKey);
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
