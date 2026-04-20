import type { CmsSectionKey } from "../models/cms-section-key.type";
import type { JsonRecord } from "../types/json-record.type";

class CmsPayloadMapper {
  private normalizeDateValue(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const text = String(value).trim();
    if (!text) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    const slashMatch = text.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
    if (slashMatch) {
      const [, mm, dd, yyyy] = slashMatch;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return null;
  }

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
      const categories = Array.isArray(payload.categories) ? payload.categories : [];
      const seasonFocus = Array.isArray(payload.seasonFocus) ? payload.seasonFocus : [];
      return {
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        shortDescription: payload.shortDescription,
        country: payload.country,
        region: payload.region,
        category: categories[0] ?? payload.category,
        categories,
        rating: payload.rating,
        titleImageUrl: payload.titleImageUrl,
        heroImageUrl: payload.heroImageUrl,
        thumbnailUrl: payload.thumbnailUrl,
        keyHighlights: payload.keyHighlights,
        services: payload.services,
        bestTimeToVisit: payload.bestTimeToVisit,
        isPopular: payload.isPopular,
        isNew: payload.isNew,
        season: seasonFocus[0] ?? payload.season,
        seasonFocus,
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
        startingPriceCurrency: payload.startingPriceCurrency,
        startingPrice: payload.startingPrice,
        description: payload.description,
        highlights: payload.highlights,
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
        title: payload.title,
        amountCurrency: payload.amountCurrency,
        amount: payload.amount,
        destinationId: payload.destinationId,
        country: payload.country,
        description: payload.description,
        highlights: payload.highlights,
        features: payload.features,
        inclusions: payload.inclusions,
        metaTitle: payload.metaTitle,
        metaDescription: payload.metaDescription,
        keywords: payload.keywords,
        displayOrder: payload.displayOrder,
        isFeatured: payload.isFeatured,
      };
    }
    if (sectionKey === "sub-packages") {
      return {
        mainPackageId: payload.mainPackageId,
        title: payload.title,
        image: payload.image,
        rating: payload.rating,
        location: payload.location,
        durationDays: payload.durationDays,
        durationNights: payload.durationNights,
        startingPriceCurrency: payload.startingPriceCurrency,
        startingPrice: payload.startingPrice,
        transport: payload.transport,
        description: payload.description,
        snapshot: payload.snapshot,
        features: payload.features,
        itineraries: payload.itineraries,
        highlights: payload.highlights,
        inclusions: payload.inclusions,
        exclusions: payload.exclusions,
        paymentTerms: payload.paymentTerms,
        cancellationPolicy: payload.cancellationPolicy,
        tnc: payload.tnc,
        impNotes: payload.impNotes,
        metaTitle: payload.metaTitle,
        metaDescription: payload.metaDescription,
        keywords: payload.keywords,
        displayOrder: payload.displayOrder,
      };
    }
    if (sectionKey === "visa-destinations") {
      return {
        country: payload.country,
        title: payload.title,
        slug: payload.slug,
        subDescription: payload.subDescription,
        imageUrl: payload.imageUrl,
        priceCurrency: payload.priceCurrency,
        priceAmount: payload.priceAmount,
        highlights: payload.highlights,
        overviewTitle: payload.overviewTitle,
        overviewDescription: payload.overviewDescription,
        quickSupportTitle: payload.quickSupportTitle,
        quickSupportDescription: payload.quickSupportDescription,
        supportIncluded: payload.supportIncluded,
        visaDetails: payload.visaDetails,
        requirements: payload.requirements,
        metaTitle: payload.metaTitle,
        metaDescription: payload.metaDescription,
        keywords: payload.keywords,
        displayOrder: payload.displayOrder,
        isActive: payload.isActive,
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
        offerCurrency: payload.offerCurrency,
        badgeText: payload.badgeText,
        originalPrice: payload.originalPrice,
        discountedPrice: payload.discountedPrice,
        duration: payload.duration,
        description: payload.description,
        imageUrl: payload.imageUrl,
        buttonText: payload.buttonText,
        ctaUrl: payload.ctaUrl,
        expiresOn: this.normalizeDateValue(payload.expiresOn),
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
