import type {
  CmsMediaAsset,
  CmsTableEntry,
  DestinationPackageMapping,
} from "../cms.datasource";
import type { CmsSectionKey } from "../cms-section.models";

interface ICmsSectionService {
  list(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]>;
  listDeleted(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]>;
  listAdminMainPackages(): Promise<CmsTableEntry[]>;
  create(sectionKey: CmsSectionKey, payload: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  update(
    sectionKey: CmsSectionKey,
    entry: CmsTableEntry,
    payload: Record<string, unknown> | string,
  ): Promise<Record<string, unknown> | null>;
  remove(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void>;
  hardDelete(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void>;
  restore(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void>;
  getMediaEntityType(sectionKey: CmsSectionKey): string;
  listMedia(entityType: string, entityId: string): Promise<CmsMediaAsset[]>;
  createMedia(
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
  ): Promise<void>;
  updateMedia(
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
  ): Promise<void>;
  deleteMedia(mediaId: string): Promise<void>;
  uploadMedia(file: File): Promise<string>;
  listDestinationPackages(destinationId: string): Promise<DestinationPackageMapping[]>;
  mapDestinationPackage(
    destinationId: string,
    mainPackageId: string,
    displayOrder: number,
  ): Promise<void>;
  unmapDestinationPackage(destinationId: string, mappingId: string): Promise<void>;
}

export type { ICmsSectionService };
