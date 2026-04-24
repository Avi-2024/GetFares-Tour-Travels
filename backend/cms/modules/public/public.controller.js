import { AppError } from "../../core/middlewares/errorHandler.js";
import { asyncHandler } from "../../core/utils/index.js";

function createPublicCmsController({
  landingService,
  destinationsService,
  packagesService,
  visaService,
  experienceService,
}) {
  function parseCountry(value) {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  function parseCountryId(value) {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  function isCountryMismatch(
    expectedCountry,
    actualCountry,
    expectedCountryId,
    actualCountryIds = [],
  ) {
    if (expectedCountryId) {
      const matched =
        Array.isArray(actualCountryIds) &&
        actualCountryIds.some(
          (id) =>
            String(id).trim().toLowerCase() ===
            expectedCountryId.trim().toLowerCase(),
        );
      if (!matched) {
        return true;
      }
    }

    if (!expectedCountry) {
      return false;
    }

    return (
      String(expectedCountry).trim().toLowerCase() !==
      String(actualCountry || "")
        .trim()
        .toLowerCase()
    );
  }

  async function resolveActiveDestination(
    slug,
    country = null,
    countryId = null,
  ) {
    const destination = await destinationsService.getBySlug(slug);
    if (
      !destination?.isActive ||
      isCountryMismatch(
        country,
        destination.country,
        countryId,
        destination.countryIds,
      )
    ) {
      throw new AppError(404, "Destination not found", "NOT_FOUND");
    }
    return destination;
  }

  async function resolveActiveVisaDestination(
    slug,
    country = null,
    countryId = null,
  ) {
    const visaDestination = await visaService.getBySlug(slug);
    if (
      !visaDestination?.isActive ||
      isCountryMismatch(
        country,
        visaDestination.country,
        countryId,
        visaDestination.countryIds,
      )
    ) {
      throw new AppError(404, "Visa destination not found", "NOT_FOUND");
    }
    return visaDestination;
  }

  function parseBoolean(value) {
    if (value === undefined) return undefined;
    return String(value).toLowerCase() === "true";
  }

  return Object.freeze({
    home: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const [
        heroSections,
        landingPlaces,
        featuredPicks,
        destinations,
        visaDestinations,
        mainPackages,
      ] = await Promise.all([
        experienceService.listHeroSections({
          is_active: true,
          ...(country ? { country } : {}),
        }),
        landingService.list({
          active: true,
          ...(country ? { country } : {}),
          ...(countryId ? { countryId } : {}),
        }),
        experienceService.listFeaturedPicks({
          is_active: true,
          ...(country ? { country } : {}),
          ...(countryId ? { countryId } : {}),
        }),
        destinationsService.list({
          is_active: true,
          ...(country ? { country } : {}),
          ...(countryId ? { countryId } : {}),
        }),
        visaService.list({
          is_active: true,
          ...(country ? { country } : {}),
          ...(countryId ? { countryId } : {}),
        }),
        packagesService.listMainPackages({
          ...(country ? { country } : {}),
          ...(countryId ? { countryId } : {}),
        }),
      ]);

      res.json({
        success: true,
        data: {
          heroSections: heroSections.filter((section) => section.isActive),
          landingPlaces,
          featuredPicks,
          destinations,
          visaDestinations,
          mainPackages: mainPackages.filter((pkg) => pkg.publishToWebsite),
        },
      });
    }),

    listLandingPlaces: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const places = await landingService.list({
        active: true,
        ...(country ? { country } : {}),
        ...(countryId ? { countryId } : {}),
      });
      res.json({ success: true, data: places });
    }),

    listDestinations: asyncHandler(async (req, res) => {
      const filters = { is_active: true };
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      if (country) filters.country = country;
      if (countryId) filters.countryId = countryId;
      if (req.query.region) filters.region = req.query.region;
      if (req.query.category) filters.category = req.query.category;

      const isPopular = parseBoolean(req.query.isPopular);
      if (isPopular !== undefined) {
        filters.is_popular = isPopular;
      }

      const destinations = await destinationsService.list(filters);
      res.json({ success: true, data: destinations });
    }),

    getDestinationBySlug: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const destination = await resolveActiveDestination(
        req.params.slug,
        country,
        countryId,
      );
      res.json({ success: true, data: destination });
    }),

    getDestinationHighlightsBySlug: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const destination = await resolveActiveDestination(
        req.params.slug,
        country,
        countryId,
      );
      res.json({
        success: true,
        data: {
          keyHighlights:
            Array.isArray(destination.keyHighlights) ?
              destination.keyHighlights
            : [],
          services:
            Array.isArray(destination.services) ? destination.services : [],
          bestTimeToVisit:
            Array.isArray(destination.bestTimeToVisit) ?
              destination.bestTimeToVisit
            : [],
        },
      });
    }),

    getDestinationMediaBySlug: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const destination = await resolveActiveDestination(
        req.params.slug,
        country,
        countryId,
      );
      const media = await destinationsService.getMedia(destination.id);
      res.json({ success: true, data: media });
    }),

    getDestinationSeasonCardsBySlug: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const destination = await resolveActiveDestination(
        req.params.slug,
        country,
        countryId,
      );
      const seasons = await experienceService.listSeasonCards({
        destinationId: destination.id,
        isActive: true,
        ...(country ? { country } : {}),
        ...(countryId ? { countryId } : {}),
      });
      res.json({ success: true, data: seasons });
    }),

    getDestinationPackagesBySlug: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const destination = await resolveActiveDestination(
        req.params.slug,
        country,
        countryId,
      );
      const packages = await destinationsService.getPackages(destination.id);
      res.json({ success: true, data: packages });
    }),

    listPublishedPackages: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const packages = await packagesService.listPublished({
        ...(country ? { country } : {}),
        ...(countryId ? { countryId } : {}),
      });
      res.json({ success: true, data: packages });
    }),

    listMainPackages: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const packages = await packagesService.listMainPackages({
        ...(country ? { country } : {}),
        ...(countryId ? { countryId } : {}),
      });
      res.json({ success: true, data: packages });
    }),

    listSubPackages: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const packages = await packagesService.listSubPackages(
        req.params.mainPackageId,
        {
          ...(country ? { country } : {}),
          ...(countryId ? { countryId } : {}),
        },
      );
      res.json({ success: true, data: packages });
    }),

    listVisaDestinations: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const visaDestinations = await visaService.list({
        is_active: true,
        ...(country ? { country } : {}),
        ...(countryId ? { countryId } : {}),
      });
      res.json({ success: true, data: visaDestinations });
    }),

    getVisaDestinationBySlug: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const visaDestination = await resolveActiveVisaDestination(
        req.params.slug,
        country,
        countryId,
      );
      res.json({ success: true, data: visaDestination });
    }),

    getVisaDetailsBySlug: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const visaDestination = await resolveActiveVisaDestination(
        req.params.slug,
        country,
        countryId,
      );
      const details = await visaService.getDetails(
        visaDestination.id,
        req.query.sectionType || null,
      );
      res.json({ success: true, data: details });
    }),

    listFeaturedPicks: asyncHandler(async (req, res) => {
      const filters = { is_active: true };
      if (req.query.campaignType) {
        filters.campaign_type = req.query.campaignType;
      }
      if (req.query.sectionKey) {
        filters.section_key = req.query.sectionKey;
      }
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      if (country) {
        filters.country = country;
      }
      if (countryId) {
        filters.countryId = countryId;
      }

      const picks = await experienceService.listFeaturedPicks(filters);
      res.json({ success: true, data: picks });
    }),

    listSeasonCards: asyncHandler(async (req, res) => {
      const filters = { isActive: true };
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      if (country) {
        filters.country = country;
      }
      if (countryId) {
        filters.countryId = countryId;
      }

      if (req.query.destinationId) {
        filters.destinationId = req.query.destinationId;
      } else if (req.query.destinationSlug) {
        const destination = await resolveActiveDestination(
          req.query.destinationSlug,
          country,
          countryId,
        );
        filters.destinationId = destination.id;
      }

      const cards = await experienceService.listSeasonCards(filters);
      res.json({ success: true, data: cards });
    }),

    listHeroSections: asyncHandler(async (req, res) => {
      const country = parseCountry(req.query.country);
      const countryId = parseCountryId(req.query.countryId);
      const sections = await experienceService.listHeroSections({
        is_active: true,
        ...(country ? { country } : {}),
      });
      res.json({
        success: true,
        data: sections.filter((section) => section.isActive),
      });
    }),
  });
}

export { createPublicCmsController };
