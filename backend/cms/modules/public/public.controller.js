import { AppError } from "../../core/middlewares/errorHandler.js";
import { asyncHandler } from "../../core/utils/index.js";

function createPublicCmsController({
  landingService,
  destinationsService,
  packagesService,
  visaService,
  experienceService,
}) {
  async function resolveActiveDestination(slug) {
    const destination = await destinationsService.getBySlug(slug);
    if (!destination?.isActive) {
      throw new AppError(404, "Destination not found", "NOT_FOUND");
    }
    return destination;
  }

  async function resolveActiveVisaDestination(slug) {
    const visaDestination = await visaService.getBySlug(slug);
    if (!visaDestination?.isActive) {
      throw new AppError(404, "Visa destination not found", "NOT_FOUND");
    }
    return visaDestination;
  }

  function parseBoolean(value) {
    if (value === undefined) return undefined;
    return String(value).toLowerCase() === "true";
  }

  return Object.freeze({
    home: asyncHandler(async (_req, res) => {
      const [
        heroSections,
        landingPlaces,
        featuredPicks,
        destinations,
        visaDestinations,
        mainPackages,
      ] = await Promise.all([
        experienceService.listHeroSections(),
        landingService.list({ active: true }),
        experienceService.listFeaturedPicks({ is_active: true }),
        destinationsService.list({ is_active: true }),
        visaService.list({ is_active: true }),
        packagesService.listMainPackages(),
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

    listLandingPlaces: asyncHandler(async (_req, res) => {
      const places = await landingService.list({ active: true });
      res.json({ success: true, data: places });
    }),

    listDestinations: asyncHandler(async (req, res) => {
      const filters = { is_active: true };
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
      const destination = await resolveActiveDestination(req.params.slug);
      res.json({ success: true, data: destination });
    }),

    getDestinationMediaBySlug: asyncHandler(async (req, res) => {
      const destination = await resolveActiveDestination(req.params.slug);
      const media = await destinationsService.getMedia(destination.id);
      res.json({ success: true, data: media });
    }),

    getDestinationSeasonCardsBySlug: asyncHandler(async (req, res) => {
      const destination = await resolveActiveDestination(req.params.slug);
      const seasons = await experienceService.listSeasonCards({
        destinationId: destination.id,
        isActive: true,
      });
      res.json({ success: true, data: seasons });
    }),

    getDestinationPackagesBySlug: asyncHandler(async (req, res) => {
      const destination = await resolveActiveDestination(req.params.slug);
      const packages = await destinationsService.getPackages(destination.id);
      res.json({ success: true, data: packages });
    }),

    listPublishedPackages: asyncHandler(async (_req, res) => {
      const packages = await packagesService.listPublished();
      res.json({ success: true, data: packages });
    }),

    listMainPackages: asyncHandler(async (_req, res) => {
      const packages = await packagesService.listMainPackages();
      res.json({
        success: true,
        data: packages.filter((pkg) => pkg.publishToWebsite),
      });
    }),

    listSubPackages: asyncHandler(async (req, res) => {
      const packages = await packagesService.listSubPackages(req.params.mainPackageId);
      res.json({ success: true, data: packages });
    }),

    listVisaDestinations: asyncHandler(async (_req, res) => {
      const visaDestinations = await visaService.list({ is_active: true });
      res.json({ success: true, data: visaDestinations });
    }),

    getVisaDestinationBySlug: asyncHandler(async (req, res) => {
      const visaDestination = await resolveActiveVisaDestination(req.params.slug);
      res.json({ success: true, data: visaDestination });
    }),

    getVisaDetailsBySlug: asyncHandler(async (req, res) => {
      const visaDestination = await resolveActiveVisaDestination(req.params.slug);
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

      const picks = await experienceService.listFeaturedPicks(filters);
      res.json({ success: true, data: picks });
    }),

    listSeasonCards: asyncHandler(async (req, res) => {
      const filters = { isActive: true };

      if (req.query.destinationId) {
        filters.destinationId = req.query.destinationId;
      } else if (req.query.destinationSlug) {
        const destination = await resolveActiveDestination(req.query.destinationSlug);
        filters.destinationId = destination.id;
      }

      const cards = await experienceService.listSeasonCards(filters);
      res.json({ success: true, data: cards });
    }),

    listHeroSections: asyncHandler(async (_req, res) => {
      const sections = await experienceService.listHeroSections();
      res.json({
        success: true,
        data: sections.filter((section) => section.isActive),
      });
    }),
  });
}

export { createPublicCmsController };
