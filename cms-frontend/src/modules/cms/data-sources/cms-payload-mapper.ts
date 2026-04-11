import type { CmsSectionKey } from "../models/cms-section-key.type";
import type { JsonRecord } from "../types/json-record.type";

class CmsPayloadMapper {
  public mapForSection(sectionKey: CmsSectionKey, payload: JsonRecord): JsonRecord {
    if (sectionKey === "landing-places") {
      const title = payload.title ?? payload.name;
      return {
        title,
        name: title,
        country: payload.country,
        description: payload.description,
        tag: payload.tag,
        image: payload.image ?? payload.imageUrl,
        imageUrl: payload.imageUrl,
        displayOrder: payload.displayOrder,
        isActive: payload.isActive,
      };
    }
    if (sectionKey === "destinations") {
      return {
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        shortDescription: payload.shortDescription,
        country: payload.country,
        region: payload.region,
        category: payload.category,
        rating: payload.rating,
        heroImageUrl: payload.heroImageUrl,
        thumbnailUrl: payload.thumbnailUrl,
        isPopular: payload.isPopular,
        isNew: payload.isNew,
        travelType: payload.travelType,
        season: payload.season,
        metaTitle: payload.metaTitle,
        metaDescription: payload.metaDescription,
        isActive: payload.isActive,
      };
    }
    if (sectionKey === "published-packages") {
      return {
        name: payload.name,
        destinationId: payload.destinationId,
        duration: payload.duration,
        startingPrice: payload.startingPrice,
        inclusions: payload.inclusions,
        exclusions: payload.exclusions,
        hotelDetails: payload.hotelDetails,
        validFrom: payload.validFrom,
        validTo: payload.validTo,
        packageCategory: payload.packageCategory,
        status: payload.status,
        bannerImageUrl: payload.bannerImageUrl,
        galleryImageUrls: payload.galleryImageUrls,
        metaTitle: payload.metaTitle,
        metaDescription: payload.metaDescription,
        keywords: payload.keywords,
        websiteSlug: payload.websiteSlug,
        isSoldOut: payload.isSoldOut,
        publishToWebsite: payload.publishToWebsite,
      };
    }
    if (sectionKey === "main-packages") {
      return {
        packageId: payload.packageId,
        destinationId: payload.destinationId,
        country: payload.country,
        displayOrder: payload.displayOrder,
        isFeatured: payload.isFeatured,
      };
    }
    if (sectionKey === "sub-packages") {
      return {
        mainPackageId: payload.mainPackageId,
        packageId: payload.packageId,
        displayOrder: payload.displayOrder,
      };
    }
    if (sectionKey === "visa-destinations") {
      return {
        country: payload.country,
        title: payload.title,
        slug: payload.slug,
        subtitle: payload.subtitle,
        description: payload.description,
        imageUrl: payload.imageUrl,
        heroImageUrl: payload.heroImageUrl,
        processingTime: payload.processingTime,
        supportInfo: payload.supportInfo,
        iconName: payload.iconName,
        highlights: payload.highlights,
        ctaText: payload.ctaText,
        displayOrder: payload.displayOrder,
        isActive: payload.isActive,
      };
    }
    if (sectionKey === "visa-details") {
      return {
        visaDestinationId: payload.visaDestinationId,
        sectionType: payload.sectionType,
        label: payload.label,
        value: payload.value,
        displayOrder: payload.displayOrder,
      };
    }
    if (sectionKey === "creative-toolkit") {
      return {
        title: payload.title,
        slug: payload.slug,
        subtitle: payload.subtitle,
        category: payload.category,
        campaignType: payload.campaignType,
        sectionKey: payload.sectionKey,
        referenceId: payload.referenceId,
        country: payload.country,
        rating: payload.rating,
        badgeText: payload.badgeText,
        originalPrice: payload.originalPrice,
        discountedPrice: payload.discountedPrice,
        duration: payload.duration,
        description: payload.description,
        imageUrl: payload.imageUrl,
        buttonText: payload.buttonText,
        ctaUrl: payload.ctaUrl,
        expiresOn: payload.expiresOn,
        tags: payload.tags,
        highlights: payload.highlights,
        displayOrder: payload.displayOrder,
        isActive: payload.isActive,
      };
    }
    return payload;
  }
}

export { CmsPayloadMapper };
