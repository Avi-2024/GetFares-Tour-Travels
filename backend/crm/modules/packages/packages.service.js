import { AppError } from "../../core/errors/index.js";

const PACKAGE_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  SOLD_OUT: "SOLD_OUT",
});

function createPackagesService({ repository, logger, events }) {
  function normalizeText(value) {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  }

  function toDateOnly(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  function toNumber(value, fallback = 0) {
    if (value === undefined || value === null) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeCustomServices(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  function toPackage(row) {
    if (!row) return null;
    const kindRaw = String(
      row.package_kind ?? row.packageKind ?? "READY",
    ).toUpperCase();
    return {
      id: row.id,
      name: row.name ?? null,
      destination: row.destination ?? null,
      duration: row.duration ?? null,
      baseCost: Number(row.base_cost ?? row.baseCost ?? 0),
      markupPercent: Number(row.markup_percent ?? row.markupPercent ?? 0),
      startingPrice: Number(row.starting_price ?? row.startingPrice ?? 0),
      packageKind: kindRaw === "CUSTOMIZED" ? "CUSTOMIZED" : "READY",
      customServices: normalizeCustomServices(
        row.custom_services ?? row.customServices,
      ),
      visaDetails: row.visa_details ?? row.visaDetails ?? null,
      paymentTerms: row.payment_terms ?? row.paymentTerms ?? null,
      inclusions: row.inclusions ?? null,
      exclusions: row.exclusions ?? null,
      itinerary: row.itinerary ?? null,
      hotelDetails: row.hotel_details ?? row.hotelDetails ?? null,
      validFrom: row.valid_from ?? row.validFrom ?? null,
      validTo: row.valid_to ?? row.validTo ?? null,
      cancellationPolicy: row.cancellation_policy ?? row.cancellationPolicy ?? null,
      packageCategory: row.package_category ?? row.packageCategory ?? null,
      status: row.status ?? PACKAGE_STATUS.DRAFT,
      bannerImageUrl: row.banner_image_url ?? row.bannerImageUrl ?? null,
      galleryImageUrls: row.gallery_image_urls ?? row.galleryImageUrls ?? [],
      metaTitle: row.meta_title ?? row.metaTitle ?? null,
      metaDescription: row.meta_description ?? row.metaDescription ?? null,
      keywords: row.keywords ?? null,
      publishToWebsite: row.publish_to_website ?? row.publishToWebsite ?? false,
      websiteSlug: row.website_slug ?? row.websiteSlug ?? null,
      websiteLastSyncedAt:
        row.website_last_synced_at ?? row.websiteLastSyncedAt ?? null,
      isSoldOut: row.is_sold_out ?? row.isSoldOut ?? false,
      createdBy: row.created_by ?? row.createdBy ?? null,
      updatedBy: row.updated_by ?? row.updatedBy ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    };
  }

  function toEnquiry(row) {
    if (!row) return null;
    return {
      id: row.id,
      packageId: row.package_id ?? row.packageId ?? null,
      leadId: row.lead_id ?? row.leadId ?? null,
      packageName: row.package_name ?? row.packageName ?? null,
      travelDate: row.travel_date ?? row.travelDate ?? null,
      travellersCount: row.travellers_count ?? row.travellersCount ?? 1,
      fullName: row.full_name ?? row.fullName ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      source: row.source ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
    };
  }

  async function requirePackage(id, context = {}) {
    logger.debug(
      { module: "packages", requestId: context.requestId, id },
      "Get package by id",
    );
    const existing = await repository.findById(id);
    if (!existing || existing.is_deleted) {
      throw new AppError(404, "Package not found", "PACKAGE_NOT_FOUND");
    }
    return existing;
  }

  async function requireAnyPackage(id, context = {}) {
    logger.debug(
      { module: "packages", requestId: context.requestId, id },
      "Get package by id (any state)",
    );
    const existing = await repository.findById(id);
    if (!existing) {
      throw new AppError(404, "Package not found", "PACKAGE_NOT_FOUND");
    }
    return existing;
  }

  function computeStartingPrice(payload, existing = null) {
    const baseCost = toNumber(payload.baseCost, toNumber(existing?.base_cost, 0));
    const markupPercent = toNumber(
      payload.markupPercent,
      toNumber(existing?.markup_percent, 0),
    );
    const assertStartingPrice = (startingPrice) => {
      if (baseCost > 0 && startingPrice <= baseCost) {
        throw new AppError(
          400,
          "Starting price must be greater than base cost",
          "PACKAGE_INVALID_PRICING",
        );
      }
    };
    if (payload.startingPrice !== undefined) {
      const startingPrice = toNumber(payload.startingPrice, 0);
      assertStartingPrice(startingPrice);
      return {
        baseCost,
        markupPercent,
        startingPrice,
      };
    }
    const derived = Number((baseCost * (1 + markupPercent / 100)).toFixed(2));
    assertStartingPrice(derived);
    return { baseCost, markupPercent, startingPrice: derived };
  }

  function buildPatch(payload, existing = null, userId = null) {
    const pricing = computeStartingPrice(payload, existing);
    const patch = {
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    };
    if (payload.name !== undefined) patch.name = normalizeText(payload.name);
    if (payload.destination !== undefined) {
      patch.destination = normalizeText(payload.destination);
    }
    if (payload.duration !== undefined) patch.duration = normalizeText(payload.duration);
    if (
      payload.baseCost !== undefined ||
      payload.markupPercent !== undefined ||
      payload.startingPrice !== undefined
    ) {
      patch.base_cost = pricing.baseCost;
      patch.markup_percent = pricing.markupPercent;
      patch.starting_price = pricing.startingPrice;
    }
    if (payload.inclusions !== undefined) patch.inclusions = payload.inclusions || null;
    if (payload.exclusions !== undefined) patch.exclusions = payload.exclusions || null;
    if (payload.itinerary !== undefined) patch.itinerary = payload.itinerary ?? null;
    if (payload.hotelDetails !== undefined) {
      patch.hotel_details = payload.hotelDetails || null;
    }
    if (payload.validFrom !== undefined) patch.valid_from = toDateOnly(payload.validFrom);
    if (payload.validTo !== undefined) patch.valid_to = toDateOnly(payload.validTo);
    if (payload.cancellationPolicy !== undefined) {
      patch.cancellation_policy = payload.cancellationPolicy || null;
    }
    if (payload.packageCategory !== undefined) {
      patch.package_category = payload.packageCategory || null;
    }
    if (payload.status !== undefined) patch.status = payload.status;
    if (payload.bannerImageUrl !== undefined) {
      patch.banner_image_url = payload.bannerImageUrl || null;
    }
    if (payload.galleryImageUrls !== undefined) {
      patch.gallery_image_urls = payload.galleryImageUrls || [];
    }
    if (payload.metaTitle !== undefined) patch.meta_title = payload.metaTitle || null;
    if (payload.metaDescription !== undefined) {
      patch.meta_description = payload.metaDescription || null;
    }
    if (payload.keywords !== undefined) patch.keywords = payload.keywords || null;
    if (payload.publishToWebsite !== undefined) {
      patch.publish_to_website = payload.publishToWebsite;
      patch.website_last_synced_at = new Date().toISOString();
    }
    if (payload.websiteSlug !== undefined) patch.website_slug = payload.websiteSlug || null;
    if (payload.isSoldOut !== undefined) {
      patch.is_sold_out = payload.isSoldOut;
      if (payload.isSoldOut) {
        patch.status = PACKAGE_STATUS.SOLD_OUT;
      }
    }
    return patch;
  }

  return Object.freeze({
    async list(filters = {}, context = {}) {
      const rows = await repository.findAll(filters);
      const search = normalizeText(filters.search)?.toLowerCase();
      const destinationFilter = normalizeText(filters.destination)?.toLowerCase();
      const filtered = rows.filter((row) => {
        if (row.is_deleted === true || row.isDeleted === true) return false;
        if (
          destinationFilter &&
          !String(row.destination || "").toLowerCase().includes(destinationFilter)
        ) {
          return false;
        }
        if (!search) return true;
        const blob = `${row.name || ""} ${row.destination || ""}`.toLowerCase();
        return blob.includes(search);
      });
      return filtered.map((row) => toPackage(row));
    },

    async getById(id, context = {}) {
      const existing = await requirePackage(id, context);
      return toPackage(existing);
    },

    async create(payload, context = {}) {
      const now = new Date().toISOString();
      const pricing = computeStartingPrice(payload);
      const kind =
        String(payload.packageKind || "READY").toUpperCase() === "CUSTOMIZED" ?
          "CUSTOMIZED"
        : "READY";
      const row = await repository.create({
        name: normalizeText(payload.name),
        destination: normalizeText(payload.destination),
        duration: normalizeText(payload.duration),
        base_cost: pricing.baseCost,
        markup_percent: pricing.markupPercent,
        starting_price: pricing.startingPrice,
        package_kind: kind,
        custom_services: Array.isArray(payload.customServices) ?
          payload.customServices
        : [],
        visa_details: payload.visaDetails || null,
        payment_terms: payload.paymentTerms || null,
        inclusions: payload.inclusions || null,
        exclusions: payload.exclusions || null,
        itinerary: payload.itinerary ?? null,
        hotel_details: payload.hotelDetails || null,
        valid_from: toDateOnly(payload.validFrom),
        valid_to: toDateOnly(payload.validTo),
        cancellation_policy: payload.cancellationPolicy || null,
        package_category: payload.packageCategory || null,
        status: payload.status || PACKAGE_STATUS.DRAFT,
        banner_image_url: payload.bannerImageUrl || null,
        gallery_image_urls: payload.galleryImageUrls || [],
        meta_title: payload.metaTitle || null,
        meta_description: payload.metaDescription || null,
        keywords: payload.keywords || null,
        publish_to_website: payload.publishToWebsite ?? false,
        website_slug: payload.websiteSlug || null,
        website_last_synced_at: payload.publishToWebsite ? now : null,
        is_sold_out: payload.isSoldOut ?? false,
        created_by: context.user?.id || null,
        updated_by: context.user?.id || null,
        created_at: now,
        updated_at: now,
      });
      const result = toPackage(row);
      events.emitCreated(result);
      return result;
    },

    async delete(id, context = {}) {
      const existing = await requirePackage(id, context);
      await repository.softDelete(existing.id);
      return { success: true };
    },

    async restore(id, context = {}) {
      const existing = await requireAnyPackage(id, context);
      await repository.restore(existing.id);
      const refreshed = await repository.findById(existing.id);
      return toPackage(refreshed);
    },

    async hardDelete(id, context = {}) {
      await requireAnyPackage(id, context);
      await repository.hardDelete(id);
      return { success: true };
    },

    async update(id, payload, context = {}) {
      const existing = await requirePackage(id, context);
      const patch = buildPatch(payload, existing, context.user?.id || null);
      const updated = await repository.update(id, patch);
      const result = toPackage(updated || existing);
      events.emitUpdated(result);
      return result;
    },

    async publish(id, payload = {}, context = {}) {
      const existing = await requirePackage(id, context);
      const publishToWebsite = payload.publishToWebsite ?? true;
      const updated = await repository.update(id, {
        publish_to_website: publishToWebsite,
        status: publishToWebsite ? PACKAGE_STATUS.ACTIVE : existing.status,
        website_last_synced_at: new Date().toISOString(),
        updated_by: context.user?.id || null,
        updated_at: new Date().toISOString(),
      });
      const result = toPackage(updated || existing);
      events.emitPublished(result);
      return result;
    },

    async createEnquiry(packageId, payload = {}, context = {}) {
      const pkg = await requirePackage(packageId, context);
      const row = await repository.createEnquiry({
        package_id: packageId,
        lead_id: payload.leadId || null,
        package_name: payload.packageName || pkg.name,
        travel_date: toDateOnly(payload.travelDate),
        travellers_count: payload.travellersCount ?? 1,
        full_name: payload.fullName || null,
        phone: payload.phone || null,
        email: payload.email || null,
        source: payload.source || "Website - Package Page",
      });
      const result = toEnquiry(row);
      events.emitEnquiryCreated(result);
      return result;
    },

    async listEnquiries(packageId, context = {}) {
      await requirePackage(packageId, context);
      const rows = await repository.listEnquiriesByPackageId(packageId);
      return rows.map((row) => toEnquiry(row));
    },
  });
}

export { createPackagesService };
