interface CmsMediaAsset {
  id: string;
  entityType: string;
  entityId: string;
  mediaKind: string;
  mediaUrl: string;
  thumbnailUrl: string;
  title: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
  isActive: boolean;
}

export type { CmsMediaAsset };
