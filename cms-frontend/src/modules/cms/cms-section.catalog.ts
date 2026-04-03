import {
  CmsFilterChip,
  CmsInsightCard,
  CmsMetricItem,
  CmsSectionViewModel,
  CmsTableCell,
  CmsTableColumn,
  CmsTableRow,
  CmsUploadBox,
  type CmsSectionKey,
} from "./cms-section.models";

class CmsSectionCatalog {
  private static createRow(
    id: string,
    cells: Record<string, CmsTableCell>,
  ): CmsTableRow {
    return new CmsTableRow(id, cells);
  }

  private static createCell(value: string): CmsTableCell {
    return new CmsTableCell(value, "default");
  }

  private static createSuccessCell(value: string): CmsTableCell {
    return new CmsTableCell(value, "success");
  }

  private static createWarningCell(value: string): CmsTableCell {
    return new CmsTableCell(value, "warning");
  }

  private static createInfoCell(value: string): CmsTableCell {
    return new CmsTableCell(value, "info");
  }

  private static buildLandingPlacesSection(): CmsSectionViewModel {
    return new CmsSectionViewModel(
      "landing-places",
      "Landing Hero",
      "Landing Places",
      "Manage `landing_places` cards shown on the Get2Vacation homepage hero.",
      "Add Landing Place",
      [
        new CmsMetricItem("Active Hero Cards", "4 / 4", "Capacity lock", "primary"),
        new CmsMetricItem("Scheduled Swaps", "2", "Next in 6h", "accent"),
        new CmsMetricItem("Avg CTR", "5.8%", "+0.9% this week", "success"),
      ],
      [
        new CmsFilterChip("Active"),
        new CmsFilterChip("Inactive"),
        new CmsFilterChip("Top Ordered"),
        new CmsFilterChip("Last Updated"),
      ],
      [
        new CmsTableColumn("name", "Place", true),
        new CmsTableColumn("tag", "Tag"),
        new CmsTableColumn("displayOrder", "Display Order"),
        new CmsTableColumn("isActive", "Website Status"),
        new CmsTableColumn("updatedAt", "Updated At"),
      ],
      [
        CmsSectionCatalog.createRow("landing-1", {
          name: CmsSectionCatalog.createCell("Swiss Alps Escape"),
          tag: CmsSectionCatalog.createCell("Luxury"),
          displayOrder: CmsSectionCatalog.createCell("#1"),
          isActive: CmsSectionCatalog.createSuccessCell("Active"),
          updatedAt: CmsSectionCatalog.createCell("13 min ago"),
        }),
        CmsSectionCatalog.createRow("landing-2", {
          name: CmsSectionCatalog.createCell("Bali Weekend Burst"),
          tag: CmsSectionCatalog.createCell("Trending"),
          displayOrder: CmsSectionCatalog.createCell("#2"),
          isActive: CmsSectionCatalog.createSuccessCell("Active"),
          updatedAt: CmsSectionCatalog.createCell("58 min ago"),
        }),
        CmsSectionCatalog.createRow("landing-3", {
          name: CmsSectionCatalog.createCell("Dubai City Lights"),
          tag: CmsSectionCatalog.createCell("Family"),
          displayOrder: CmsSectionCatalog.createCell("#3"),
          isActive: CmsSectionCatalog.createWarningCell("Draft"),
          updatedAt: CmsSectionCatalog.createCell("Yesterday"),
        }),
        CmsSectionCatalog.createRow("landing-4", {
          name: CmsSectionCatalog.createCell("Maldives Honeymoon"),
          tag: CmsSectionCatalog.createCell("New"),
          displayOrder: CmsSectionCatalog.createCell("#4"),
          isActive: CmsSectionCatalog.createSuccessCell("Active"),
          updatedAt: CmsSectionCatalog.createCell("2 days ago"),
        }),
      ],
      [
        new CmsInsightCard(
          "Purpose",
          "Landing cards are the first conversion touchpoint on the public website.",
          [
            "Data source table: landing_places",
            "Maximum 4 active cards enforced by backend service",
            "Supports reorder and soft-delete lifecycle",
          ],
        ),
        new CmsInsightCard(
          "Editorial Flow",
          "Content team rotates cards by season and campaign priorities.",
          [
            "Use tag for campaign context",
            "Upload image_url with hero-safe dimensions",
            "Toggle is_active only after QA preview",
          ],
        ),
      ],
      new CmsUploadBox(
        "Hero Media Upload",
        "Upload optimized hero card images for homepage carousel slots.",
        "Upload Hero Image",
      ),
      "No inactive landing cards",
      "All hero slots are currently configured and published.",
    );
  }

  private static buildDestinationsSection(): CmsSectionViewModel {
    return new CmsSectionViewModel(
      "destinations",
      "Destination Catalog",
      "Destinations",
      "Operate `destinations` and related media, season cards, and package mappings for the website.",
      "Create Destination",
      [
        new CmsMetricItem("Active Destinations", "128", "+12 this month", "primary"),
        new CmsMetricItem("Popular Flagged", "37", "+4 this week", "accent"),
        new CmsMetricItem("SEO Completion", "84%", "+6% this sprint", "success"),
      ],
      [
        new CmsFilterChip("Region"),
        new CmsFilterChip("Category"),
        new CmsFilterChip("Travel Type"),
        new CmsFilterChip("Popular"),
        new CmsFilterChip("New"),
      ],
      [
        new CmsTableColumn("destination", "Destination", true),
        new CmsTableColumn("region", "Region"),
        new CmsTableColumn("travelType", "Travel Type"),
        new CmsTableColumn("media", "Media Assets"),
        new CmsTableColumn("seo", "SEO Status"),
        new CmsTableColumn("status", "Status"),
      ],
      [
        CmsSectionCatalog.createRow("dest-1", {
          destination: CmsSectionCatalog.createCell("Bali, Indonesia"),
          region: CmsSectionCatalog.createCell("Asia"),
          travelType: CmsSectionCatalog.createCell("Leisure"),
          media: CmsSectionCatalog.createCell("34 files"),
          seo: CmsSectionCatalog.createSuccessCell("Ready"),
          status: CmsSectionCatalog.createSuccessCell("Active"),
        }),
        CmsSectionCatalog.createRow("dest-2", {
          destination: CmsSectionCatalog.createCell("Zurich, Switzerland"),
          region: CmsSectionCatalog.createCell("Europe"),
          travelType: CmsSectionCatalog.createCell("Luxury"),
          media: CmsSectionCatalog.createCell("19 files"),
          seo: CmsSectionCatalog.createInfoCell("In Review"),
          status: CmsSectionCatalog.createSuccessCell("Active"),
        }),
        CmsSectionCatalog.createRow("dest-3", {
          destination: CmsSectionCatalog.createCell("Phuket, Thailand"),
          region: CmsSectionCatalog.createCell("Asia"),
          travelType: CmsSectionCatalog.createCell("Family"),
          media: CmsSectionCatalog.createCell("27 files"),
          seo: CmsSectionCatalog.createWarningCell("Missing Meta"),
          status: CmsSectionCatalog.createWarningCell("Draft"),
        }),
        CmsSectionCatalog.createRow("dest-4", {
          destination: CmsSectionCatalog.createCell("Paris, France"),
          region: CmsSectionCatalog.createCell("Europe"),
          travelType: CmsSectionCatalog.createCell("Romantic"),
          media: CmsSectionCatalog.createCell("41 files"),
          seo: CmsSectionCatalog.createSuccessCell("Ready"),
          status: CmsSectionCatalog.createSuccessCell("Active"),
        }),
      ],
      [
        new CmsInsightCard(
          "Schema Mapping",
          "Destination pages are composed from multiple CMS tables.",
          [
            "destinations: core profile + SEO fields",
            "destination_media: image and video gallery",
            "season_cards: best-time informational blocks",
          ],
        ),
        new CmsInsightCard(
          "Website Impact",
          "These entries power listing pages, detail pages, and recommendation modules.",
          [
            "slug controls website URL structure",
            "is_popular powers featured ribbons",
            "Package mapping drives related offers",
          ],
        ),
      ],
      new CmsUploadBox(
        "Destination Media Upload",
        "Upload destination galleries, hero visuals, and thumbnail assets.",
        "Upload Destination Media",
      ),
      "No destination drafts pending",
      "All destination entries currently have publish-ready metadata.",
    );
  }

  private static buildPublishedPackagesSection(): CmsSectionViewModel {
    return new CmsSectionViewModel(
      "published-packages",
      "CRM Sync",
      "Published Packages",
      "Read-only feed from CRM `packages` table used to curate website package inventory.",
      "Sync Packages",
      [
        new CmsMetricItem("Published in CRM", "326", "+18 this month", "primary"),
        new CmsMetricItem("Synced to CMS", "321", "98.4% sync", "success"),
        new CmsMetricItem("Sync Exceptions", "5", "Needs review", "warning"),
      ],
      [
        new CmsFilterChip("Recently Synced"),
        new CmsFilterChip("Price Range"),
        new CmsFilterChip("Duration"),
        new CmsFilterChip("Region"),
      ],
      [
        new CmsTableColumn("package", "Package", true),
        new CmsTableColumn("destination", "Destination"),
        new CmsTableColumn("duration", "Duration"),
        new CmsTableColumn("price", "Base Price"),
        new CmsTableColumn("crmState", "CRM State"),
        new CmsTableColumn("syncAt", "Synced At"),
      ],
      [
        CmsSectionCatalog.createRow("pub-1", {
          package: CmsSectionCatalog.createCell("ALP-7N-PRIME"),
          destination: CmsSectionCatalog.createCell("Swiss Alps"),
          duration: CmsSectionCatalog.createCell("7N / 8D"),
          price: CmsSectionCatalog.createCell("INR 1,84,000"),
          crmState: CmsSectionCatalog.createSuccessCell("Published"),
          syncAt: CmsSectionCatalog.createCell("4 min ago"),
        }),
        CmsSectionCatalog.createRow("pub-2", {
          package: CmsSectionCatalog.createCell("BALI-4N-ESC"),
          destination: CmsSectionCatalog.createCell("Bali"),
          duration: CmsSectionCatalog.createCell("4N / 5D"),
          price: CmsSectionCatalog.createCell("INR 82,000"),
          crmState: CmsSectionCatalog.createSuccessCell("Published"),
          syncAt: CmsSectionCatalog.createCell("11 min ago"),
        }),
        CmsSectionCatalog.createRow("pub-3", {
          package: CmsSectionCatalog.createCell("PAR-5N-SIG"),
          destination: CmsSectionCatalog.createCell("Paris"),
          duration: CmsSectionCatalog.createCell("5N / 6D"),
          price: CmsSectionCatalog.createCell("INR 1,12,500"),
          crmState: CmsSectionCatalog.createWarningCell("Queued"),
          syncAt: CmsSectionCatalog.createCell("1h ago"),
        }),
      ],
      [
        new CmsInsightCard(
          "Purpose",
          "Published packages are the source inventory for CMS curation.",
          [
            "Read from shared CRM packages table",
            "Used by main_packages and sub_packages mappings",
            "Unpublished records are blocked by backend rules",
          ],
        ),
        new CmsInsightCard(
          "Operational Use",
          "Content team verifies website readiness without editing CRM deal logic.",
          [
            "Monitor sync lag and stale updates",
            "Identify unpublished dependencies",
            "Escalate exceptions to CRM ops team",
          ],
        ),
      ],
      new CmsUploadBox(
        "Package Creative Upload",
        "Attach package banners and teaser visuals linked to CRM packages.",
        "Upload Package Assets",
      ),
      "No package sync issues",
      "CRM and CMS package feeds are currently aligned.",
    );
  }

  private static buildMainPackagesSection(): CmsSectionViewModel {
    return new CmsSectionViewModel(
      "main-packages",
      "Package Architecture",
      "Main Packages",
      "Curate website parent package groups from `main_packages` with destination linkage via `destination_package_map`.",
      "Create Main Package",
      [
        new CmsMetricItem("Main Package Groups", "74", "+3 this month", "primary"),
        new CmsMetricItem("Featured Groups", "12", "Homepage eligible", "accent"),
        new CmsMetricItem("Mapped Destinations", "209", "+16 this sprint", "success"),
      ],
      [
        new CmsFilterChip("Featured"),
        new CmsFilterChip("Unmapped"),
        new CmsFilterChip("Recently Updated"),
        new CmsFilterChip("High Conversion"),
      ],
      [
        new CmsTableColumn("mainPackage", "Main Package", true),
        new CmsTableColumn("sourcePackage", "Source Package"),
        new CmsTableColumn("featured", "Featured"),
        new CmsTableColumn("linkedDestinations", "Linked Destinations"),
        new CmsTableColumn("displayOrder", "Display Order"),
        new CmsTableColumn("updatedAt", "Updated At"),
      ],
      [
        CmsSectionCatalog.createRow("main-1", {
          mainPackage: CmsSectionCatalog.createCell("European Grand Tour"),
          sourcePackage: CmsSectionCatalog.createCell("EUR-12D-CORE"),
          featured: CmsSectionCatalog.createSuccessCell("Yes"),
          linkedDestinations: CmsSectionCatalog.createCell("8 destinations"),
          displayOrder: CmsSectionCatalog.createCell("#1"),
          updatedAt: CmsSectionCatalog.createCell("22 min ago"),
        }),
        CmsSectionCatalog.createRow("main-2", {
          mainPackage: CmsSectionCatalog.createCell("Beach Escape Collection"),
          sourcePackage: CmsSectionCatalog.createCell("BEA-8D-LUX"),
          featured: CmsSectionCatalog.createSuccessCell("Yes"),
          linkedDestinations: CmsSectionCatalog.createCell("6 destinations"),
          displayOrder: CmsSectionCatalog.createCell("#2"),
          updatedAt: CmsSectionCatalog.createCell("1h ago"),
        }),
        CmsSectionCatalog.createRow("main-3", {
          mainPackage: CmsSectionCatalog.createCell("Budget Explorer Asia"),
          sourcePackage: CmsSectionCatalog.createCell("ASI-7D-BGT"),
          featured: CmsSectionCatalog.createWarningCell("No"),
          linkedDestinations: CmsSectionCatalog.createCell("5 destinations"),
          displayOrder: CmsSectionCatalog.createCell("#4"),
          updatedAt: CmsSectionCatalog.createCell("Yesterday"),
        }),
      ],
      [
        new CmsInsightCard(
          "Schema Mapping",
          "Main packages are the parent merchandising entity in CMS.",
          [
            "main_packages: parent package definitions",
            "destination_package_map: destination placement mapping",
            "is_featured controls homepage visibility",
          ],
        ),
        new CmsInsightCard(
          "Website Impact",
          "Main packages structure top-level package routes and recommendation logic.",
          [
            "Curates package lineup by campaign",
            "Controls destination-level cross-linking",
            "Improves package discovery UX",
          ],
        ),
      ],
      new CmsUploadBox(
        "Main Package Banner Upload",
        "Add hero visuals and campaign banners for main package cards.",
        "Upload Main Banner",
      ),
      "No unmapped main packages",
      "All main package groups are linked to at least one destination.",
    );
  }

  private static buildSubPackagesSection(): CmsSectionViewModel {
    return new CmsSectionViewModel(
      "sub-packages",
      "Modular Itineraries",
      "Sub Packages",
      "Manage child package variants from `sub_packages` for flexible itinerary options under each main package.",
      "Create Sub Package",
      [
        new CmsMetricItem("Sub Package Variants", "184", "+9 this month", "primary"),
        new CmsMetricItem("Parent Coverage", "96%", "Main packages covered", "success"),
        new CmsMetricItem("Draft Variants", "14", "Need final review", "warning"),
      ],
      [
        new CmsFilterChip("By Main Package"),
        new CmsFilterChip("By Nights"),
        new CmsFilterChip("By Budget"),
        new CmsFilterChip("Draft"),
      ],
      [
        new CmsTableColumn("variant", "Variant", true),
        new CmsTableColumn("mainPackage", "Main Package"),
        new CmsTableColumn("duration", "Duration"),
        new CmsTableColumn("priceBand", "Price Band"),
        new CmsTableColumn("displayOrder", "Display Order"),
        new CmsTableColumn("status", "Status"),
      ],
      [
        CmsSectionCatalog.createRow("sub-1", {
          variant: CmsSectionCatalog.createCell("Swiss Premium 5N"),
          mainPackage: CmsSectionCatalog.createCell("European Grand Tour"),
          duration: CmsSectionCatalog.createCell("5N / 6D"),
          priceBand: CmsSectionCatalog.createCell("INR 1.2L - 1.6L"),
          displayOrder: CmsSectionCatalog.createCell("#1"),
          status: CmsSectionCatalog.createSuccessCell("Active"),
        }),
        CmsSectionCatalog.createRow("sub-2", {
          variant: CmsSectionCatalog.createCell("Swiss Luxury 7N"),
          mainPackage: CmsSectionCatalog.createCell("European Grand Tour"),
          duration: CmsSectionCatalog.createCell("7N / 8D"),
          priceBand: CmsSectionCatalog.createCell("INR 1.8L - 2.4L"),
          displayOrder: CmsSectionCatalog.createCell("#2"),
          status: CmsSectionCatalog.createSuccessCell("Active"),
        }),
        CmsSectionCatalog.createRow("sub-3", {
          variant: CmsSectionCatalog.createCell("Bali Saver 3N"),
          mainPackage: CmsSectionCatalog.createCell("Beach Escape Collection"),
          duration: CmsSectionCatalog.createCell("3N / 4D"),
          priceBand: CmsSectionCatalog.createCell("INR 65K - 78K"),
          displayOrder: CmsSectionCatalog.createCell("#3"),
          status: CmsSectionCatalog.createWarningCell("Draft"),
        }),
      ],
      [
        new CmsInsightCard(
          "Schema Mapping",
          "Sub packages define purchasable variants under parent package architecture.",
          [
            "sub_packages links main_package_id to package_id",
            "display_order controls website variant order",
            "Backend validates package publish status",
          ],
        ),
        new CmsInsightCard(
          "Content Strategy",
          "Variants help cover budget segments without duplicating website structure.",
          [
            "Offer short and long trip options",
            "Create budget ladders per destination",
            "Speed up campaign-ready packaging",
          ],
        ),
      ],
      new CmsUploadBox(
        "Variant Creative Upload",
        "Upload variant-level itinerary cards and add-on promo visuals.",
        "Upload Variant Assets",
      ),
      "No orphan sub-packages",
      "Every sub package is linked to a valid main package.",
    );
  }

  private static buildVisaDestinationsSection(): CmsSectionViewModel {
    return new CmsSectionViewModel(
      "visa-destinations",
      "Visa Network",
      "Visa Destinations",
      "Control country-level visa offerings from `visa_destinations` used on website visa service listings.",
      "Create Visa Destination",
      [
        new CmsMetricItem("Active Visa Countries", "42", "+2 this quarter", "primary"),
        new CmsMetricItem("Avg Processing Time", "7.4 days", "-0.8 day", "success"),
        new CmsMetricItem("Missing Hero Images", "3", "Needs upload", "warning"),
      ],
      [
        new CmsFilterChip("Region"),
        new CmsFilterChip("Processing Time"),
        new CmsFilterChip("Active"),
        new CmsFilterChip("Needs Content"),
      ],
      [
        new CmsTableColumn("country", "Country", true),
        new CmsTableColumn("slug", "Slug"),
        new CmsTableColumn("processingTime", "Processing Time"),
        new CmsTableColumn("supportInfo", "Support Info"),
        new CmsTableColumn("heroReady", "Hero Ready"),
        new CmsTableColumn("status", "Status"),
      ],
      [
        CmsSectionCatalog.createRow("visa-d-1", {
          country: CmsSectionCatalog.createCell("United Arab Emirates"),
          slug: CmsSectionCatalog.createCell("uae-visa"),
          processingTime: CmsSectionCatalog.createCell("3 - 5 days"),
          supportInfo: CmsSectionCatalog.createCell("24x7 hotline"),
          heroReady: CmsSectionCatalog.createSuccessCell("Yes"),
          status: CmsSectionCatalog.createSuccessCell("Active"),
        }),
        CmsSectionCatalog.createRow("visa-d-2", {
          country: CmsSectionCatalog.createCell("Singapore"),
          slug: CmsSectionCatalog.createCell("singapore-visa"),
          processingTime: CmsSectionCatalog.createCell("5 - 7 days"),
          supportInfo: CmsSectionCatalog.createCell("Business hours"),
          heroReady: CmsSectionCatalog.createSuccessCell("Yes"),
          status: CmsSectionCatalog.createSuccessCell("Active"),
        }),
        CmsSectionCatalog.createRow("visa-d-3", {
          country: CmsSectionCatalog.createCell("Japan"),
          slug: CmsSectionCatalog.createCell("japan-visa"),
          processingTime: CmsSectionCatalog.createCell("8 - 12 days"),
          supportInfo: CmsSectionCatalog.createCell("Priority support"),
          heroReady: CmsSectionCatalog.createWarningCell("No"),
          status: CmsSectionCatalog.createInfoCell("In Review"),
        }),
      ],
      [
        new CmsInsightCard(
          "Schema Mapping",
          "Visa destination records are the primary website visa cards.",
          [
            "visa_destinations stores listing and detail metadata",
            "processing_time appears on card summary",
            "is_active controls visibility on website",
          ],
        ),
        new CmsInsightCard(
          "Publishing Notes",
          "Each visa country should have clear subtitle and support information.",
          [
            "Use consistent slug format",
            "Keep hero_image_url optimized",
            "Update support_info when SLA changes",
          ],
        ),
      ],
      new CmsUploadBox(
        "Visa Hero Upload",
        "Upload hero banners and country thumbnails for visa destination cards.",
        "Upload Visa Media",
      ),
      "No inactive visa destinations",
      "All configured visa destinations are currently active.",
    );
  }

  private static buildVisaDetailsSection(): CmsSectionViewModel {
    return new CmsSectionViewModel(
      "visa-details",
      "Compliance Content",
      "Visa Details",
      "Manage granular visa sections from `visa_destination_details` such as overview, facts, requirements, and notes.",
      "Add Visa Detail",
      [
        new CmsMetricItem("Total Detail Blocks", "612", "+26 this month", "primary"),
        new CmsMetricItem("Requirement Blocks", "284", "Most edited", "accent"),
        new CmsMetricItem("Stale Entries", "11", "Older than 60 days", "warning"),
      ],
      [
        new CmsFilterChip("Overview"),
        new CmsFilterChip("Fact"),
        new CmsFilterChip("Requirement"),
        new CmsFilterChip("Note"),
      ],
      [
        new CmsTableColumn("destination", "Visa Destination", true),
        new CmsTableColumn("sectionType", "Section Type"),
        new CmsTableColumn("label", "Label"),
        new CmsTableColumn("value", "Value Preview"),
        new CmsTableColumn("displayOrder", "Display Order"),
        new CmsTableColumn("updatedAt", "Updated At"),
      ],
      [
        CmsSectionCatalog.createRow("visa-det-1", {
          destination: CmsSectionCatalog.createCell("UAE Visa"),
          sectionType: CmsSectionCatalog.createInfoCell("Requirement"),
          label: CmsSectionCatalog.createCell("Passport Validity"),
          value: CmsSectionCatalog.createCell("Minimum 6 months validity required."),
          displayOrder: CmsSectionCatalog.createCell("#1"),
          updatedAt: CmsSectionCatalog.createCell("2 hours ago"),
        }),
        CmsSectionCatalog.createRow("visa-det-2", {
          destination: CmsSectionCatalog.createCell("Singapore Visa"),
          sectionType: CmsSectionCatalog.createInfoCell("Overview"),
          label: CmsSectionCatalog.createCell("Processing Summary"),
          value: CmsSectionCatalog.createCell("Typical approval timeline 5-7 working days."),
          displayOrder: CmsSectionCatalog.createCell("#1"),
          updatedAt: CmsSectionCatalog.createCell("6 hours ago"),
        }),
        CmsSectionCatalog.createRow("visa-det-3", {
          destination: CmsSectionCatalog.createCell("Japan Visa"),
          sectionType: CmsSectionCatalog.createInfoCell("Note"),
          label: CmsSectionCatalog.createCell("Document Translation"),
          value: CmsSectionCatalog.createCell("Japanese or English documents only."),
          displayOrder: CmsSectionCatalog.createCell("#4"),
          updatedAt: CmsSectionCatalog.createCell("Yesterday"),
        }),
      ],
      [
        new CmsInsightCard(
          "Schema Mapping",
          "Detail blocks create a structured content model for visa detail pages.",
          [
            "visa_destination_details grouped by section_type",
            "display_order controls on-page sequence",
            "value stores long-form guidance text",
          ],
        ),
        new CmsInsightCard(
          "Compliance Hygiene",
          "This section needs frequent review to avoid outdated policy guidance.",
          [
            "Track stale blocks via updated_at",
            "Prioritize requirement updates first",
            "Use clear labels for fast scanning",
          ],
        ),
      ],
      new CmsUploadBox(
        "Visa Documents Upload",
        "Upload requirement samples and support PDFs linked to detail sections.",
        "Upload Supporting Files",
      ),
      "No missing detail sections",
      "Every active visa destination has required base sections.",
    );
  }

  private static buildCreativeToolkitSection(): CmsSectionViewModel {
    return new CmsSectionViewModel(
      "creative-toolkit",
      "Brand System",
      "Creative Toolkit",
      "Manage promotional assets and featured website content from `featured_picks` and related destination/package references.",
      "Create Featured Pick",
      [
        new CmsMetricItem("Active Creative Blocks", "56", "+7 this month", "primary"),
        new CmsMetricItem("Homepage Placements", "18", "Across 4 zones", "accent"),
        new CmsMetricItem("Expiring Assets", "5", "Next 72 hours", "warning"),
      ],
      [
        new CmsFilterChip("Package Picks"),
        new CmsFilterChip("Destination Picks"),
        new CmsFilterChip("Visa Picks"),
        new CmsFilterChip("Expiring Soon"),
      ],
      [
        new CmsTableColumn("asset", "Creative Asset", true),
        new CmsTableColumn("category", "Category"),
        new CmsTableColumn("reference", "Reference Entity"),
        new CmsTableColumn("priceHook", "Price Hook"),
        new CmsTableColumn("badge", "Badge"),
        new CmsTableColumn("status", "Status"),
      ],
      [
        CmsSectionCatalog.createRow("creative-1", {
          asset: CmsSectionCatalog.createCell("Summer Splash Hero Strip"),
          category: CmsSectionCatalog.createCell("destination"),
          reference: CmsSectionCatalog.createCell("Bali"),
          priceHook: CmsSectionCatalog.createCell("From INR 82,000"),
          badge: CmsSectionCatalog.createCell("Hot Deal"),
          status: CmsSectionCatalog.createSuccessCell("Published"),
        }),
        CmsSectionCatalog.createRow("creative-2", {
          asset: CmsSectionCatalog.createCell("Visa Fast Track Banner"),
          category: CmsSectionCatalog.createCell("visa_service"),
          reference: CmsSectionCatalog.createCell("UAE Visa"),
          priceHook: CmsSectionCatalog.createCell("48h priority"),
          badge: CmsSectionCatalog.createCell("Express"),
          status: CmsSectionCatalog.createSuccessCell("Published"),
        }),
        CmsSectionCatalog.createRow("creative-3", {
          asset: CmsSectionCatalog.createCell("European Winter Bundle"),
          category: CmsSectionCatalog.createCell("package"),
          reference: CmsSectionCatalog.createCell("European Grand Tour"),
          priceHook: CmsSectionCatalog.createCell("Save INR 15,000"),
          badge: CmsSectionCatalog.createCell("Limited"),
          status: CmsSectionCatalog.createInfoCell("Scheduled"),
        }),
      ],
      [
        new CmsInsightCard(
          "Schema Mapping",
          "Creative toolkit maps to featured card system used on website modules.",
          [
            "featured_picks drives campaign cards",
            "category links package / destination / visa_service",
            "display_order determines placement priority",
          ],
        ),
        new CmsInsightCard(
          "Campaign Operations",
          "Marketing team can reuse premium blocks without engineering dependency.",
          [
            "Update badge_text for urgency",
            "Use discounted_price for offer ribbon",
            "Track expiring creatives by updated_at",
          ],
        ),
      ],
      new CmsUploadBox(
        "Creative Asset Upload",
        "Upload campaign art, card visuals, and CTA banner variants.",
        "Upload Creative Files",
      ),
      "No draft creatives",
      "All creative blocks are either published or scheduled.",
    );
  }

  private static buildDestinationMapSection(): CmsSectionViewModel {
    return new CmsSectionViewModel(
      "destination-map",
      "Geo Experience",
      "Destination Map",
      "Visualize website coverage by linking `destinations` with `destination_package_map` and package hierarchy.",
      "Create Destination Mapping",
      [
        new CmsMetricItem("Mapped Destinations", "128", "100% mapped", "success"),
        new CmsMetricItem("Cluster Groups", "22", "+2 this month", "primary"),
        new CmsMetricItem("Unbalanced Regions", "4", "Needs curation", "warning"),
      ],
      [
        new CmsFilterChip("By Region"),
        new CmsFilterChip("High Density"),
        new CmsFilterChip("Low Density"),
        new CmsFilterChip("Featured Paths"),
      ],
      [
        new CmsTableColumn("cluster", "Map Cluster", true),
        new CmsTableColumn("destinations", "Destinations"),
        new CmsTableColumn("mainPackages", "Main Packages"),
        new CmsTableColumn("subPackages", "Sub Packages"),
        new CmsTableColumn("coverage", "Coverage Score"),
        new CmsTableColumn("status", "Status"),
      ],
      [
        CmsSectionCatalog.createRow("map-1", {
          cluster: CmsSectionCatalog.createCell("Western Europe"),
          destinations: CmsSectionCatalog.createCell("18"),
          mainPackages: CmsSectionCatalog.createCell("7"),
          subPackages: CmsSectionCatalog.createCell("24"),
          coverage: CmsSectionCatalog.createSuccessCell("94%"),
          status: CmsSectionCatalog.createSuccessCell("Healthy"),
        }),
        CmsSectionCatalog.createRow("map-2", {
          cluster: CmsSectionCatalog.createCell("Southeast Asia"),
          destinations: CmsSectionCatalog.createCell("22"),
          mainPackages: CmsSectionCatalog.createCell("8"),
          subPackages: CmsSectionCatalog.createCell("31"),
          coverage: CmsSectionCatalog.createSuccessCell("97%"),
          status: CmsSectionCatalog.createSuccessCell("Healthy"),
        }),
        CmsSectionCatalog.createRow("map-3", {
          cluster: CmsSectionCatalog.createCell("Middle East"),
          destinations: CmsSectionCatalog.createCell("9"),
          mainPackages: CmsSectionCatalog.createCell("3"),
          subPackages: CmsSectionCatalog.createCell("8"),
          coverage: CmsSectionCatalog.createWarningCell("71%"),
          status: CmsSectionCatalog.createInfoCell("Needs Expansion"),
        }),
      ],
      [
        new CmsInsightCard(
          "Schema Mapping",
          "Destination map audits relational coverage across package and destination tables.",
          [
            "destinations act as geo anchors",
            "destination_package_map defines relationship graph",
            "main/sub packages define offer depth",
          ],
        ),
        new CmsInsightCard(
          "Planning Use",
          "Product team uses this workspace to identify thin content regions.",
          [
            "Detect low-coverage areas early",
            "Prioritize sub-package expansion",
            "Balance featured inventory by geography",
          ],
        ),
      ],
      new CmsUploadBox(
        "Map Layer Upload",
        "Upload geo overlays, route SVGs, and region background assets.",
        "Upload Map Assets",
      ),
      "No weak clusters",
      "All map clusters currently meet baseline coverage targets.",
    );
  }

  private static readonly sections: Record<CmsSectionKey, CmsSectionViewModel> =
    {
      "landing-places": CmsSectionCatalog.buildLandingPlacesSection(),
      destinations: CmsSectionCatalog.buildDestinationsSection(),
      "published-packages": CmsSectionCatalog.buildPublishedPackagesSection(),
      "main-packages": CmsSectionCatalog.buildMainPackagesSection(),
      "sub-packages": CmsSectionCatalog.buildSubPackagesSection(),
      "visa-destinations": CmsSectionCatalog.buildVisaDestinationsSection(),
      "visa-details": CmsSectionCatalog.buildVisaDetailsSection(),
      "creative-toolkit": CmsSectionCatalog.buildCreativeToolkitSection(),
      "destination-map": CmsSectionCatalog.buildDestinationMapSection(),
    };

  public static getByKey(key: CmsSectionKey): CmsSectionViewModel {
    return CmsSectionCatalog.sections[key];
  }
}

export { CmsSectionCatalog };
