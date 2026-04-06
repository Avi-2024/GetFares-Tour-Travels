import type { CmsTableEntry } from "../types/cms-table-entry.type";

class CmsEntryMediaResolver {
  public getImageUrlFromEntry(entry: CmsTableEntry): string | null {
    const preferredKeys = [
      "imageUrl",
      "image_url",
      "heroImageUrl",
      "hero_image_url",
      "thumbnailUrl",
      "thumbnail_url",
      "bannerUrl",
      "banner_url",
      "photoUrl",
      "photo_url",
    ];

    for (const key of preferredKeys) {
      const value = entry.raw[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }

    for (const [key, value] of Object.entries(entry.raw)) {
      if (typeof value !== "string") {
        continue;
      }
      const lowerKey = key.toLowerCase();
      const lowerValue = value.toLowerCase();
      const hasImageHint =
        lowerKey.includes("image") ||
        lowerKey.includes("photo") ||
        lowerKey.includes("banner") ||
        lowerKey.includes("thumbnail");
      const hasImageUrlHint =
        lowerValue.includes(".jpg") ||
        lowerValue.includes(".jpeg") ||
        lowerValue.includes(".png") ||
        lowerValue.includes(".webp") ||
        lowerValue.includes(".gif") ||
        lowerValue.includes("cloudinary") ||
        lowerValue.includes("/images/") ||
        lowerValue.startsWith("http");
      if (hasImageHint && hasImageUrlHint) {
        return value;
      }
    }

    return null;
  }

  public getEntryLabel(entry: CmsTableEntry | null): string {
    if (!entry) {
      return "selected record";
    }
    for (const cell of Object.values(entry.row.cells)) {
      if (cell.value && cell.value !== "--") {
        return cell.value;
      }
    }
    return entry.id;
  }
}

export { CmsEntryMediaResolver };
