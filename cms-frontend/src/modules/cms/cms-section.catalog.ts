import {
  CmsSectionViewModel,
  CmsTableColumn,
  CmsUploadBox,
} from "./cms-section.models";
import type {
  CmsFilterChip,
  CmsInsightCard,
  CmsMetricItem,
  CmsSectionKey,
} from "./cms-section.models";

class CmsSectionCatalog {
  private static createSection(
    key: CmsSectionKey,
    badge: string,
    title: string,
    subtitle: string,
    actionLabel: string,
    columns: CmsTableColumn[],
    emptyStateTitle: string,
    emptyStateDescription: string,
  ): CmsSectionViewModel {
    return new CmsSectionViewModel(
      key,
      badge,
      title,
      subtitle,
      actionLabel,
      [] as CmsMetricItem[],
      [] as CmsFilterChip[],
      columns,
      [],
      [] as CmsInsightCard[],
      new CmsUploadBox("Media", "Manage media for this section.", "Upload"),
      emptyStateTitle,
      emptyStateDescription,
    );
  }

  private static readonly sections: Record<CmsSectionKey, CmsSectionViewModel> = {
    "landing-places": CmsSectionCatalog.createSection(
      "landing-places",
      "Landing Hero",
      "Landing Places",
      "Manage landing place cards.",
      "Add Landing Place",
      [
        new CmsTableColumn("name", "Title", true),
        new CmsTableColumn("tag", "Tag"),
        new CmsTableColumn("isActive", "Status"),
      ],
      "No landing places found",
      "Create the first landing place to start website hero management.",
    ),
    destinations: CmsSectionCatalog.createSection(
      "destinations",
      "Destination Catalog",
      "Destinations",
      "Manage destination records and mappings.",
      "Create Destination",
      [
        new CmsTableColumn("destination", "Destination", true),
        new CmsTableColumn("region", "Region"),
        new CmsTableColumn("travelType", "Travel Type"),
        new CmsTableColumn("media", "Media"),
        new CmsTableColumn("seo", "SEO"),
        new CmsTableColumn("status", "Status"),
      ],
      "No destinations found",
      "Create destinations to populate website destination pages.",
    ),
    "published-packages": CmsSectionCatalog.createSection(
      "published-packages",
      "CRM Sync",
      "Published Packages",
      "Read-only package feed from CRM.",
      "Sync Packages",
      [
        new CmsTableColumn("package", "Package", true),
        new CmsTableColumn("destination", "Destination"),
        new CmsTableColumn("duration", "Duration"),
        new CmsTableColumn("price", "Price"),
        new CmsTableColumn("crmState", "Status"),
        new CmsTableColumn("syncAt", "Updated At"),
      ],
      "No published packages found",
      "Publish packages in CRM to make them available here.",
    ),
    "main-packages": CmsSectionCatalog.createSection(
      "main-packages",
      "Package Architecture",
      "Main Packages",
      "Manage website main package mappings.",
      "Create Main Package",
      [
        new CmsTableColumn("mainPackage", "Main Package", true),
        new CmsTableColumn("sourcePackage", "Source Package"),
        new CmsTableColumn("featured", "Featured"),
        new CmsTableColumn("linkedDestinations", "Linked Destinations"),
        new CmsTableColumn("displayOrder", "Display Order"),
        new CmsTableColumn("updatedAt", "Updated At"),
      ],
      "No main packages found",
      "Create main packages by mapping CRM published packages.",
    ),
    "sub-packages": CmsSectionCatalog.createSection(
      "sub-packages",
      "Modular Itineraries",
      "Sub Packages",
      "Manage sub-package variants.",
      "Create Sub Package",
      [
        new CmsTableColumn("variant", "Variant", true),
        new CmsTableColumn("mainPackage", "Main Package"),
        new CmsTableColumn("duration", "Duration"),
        new CmsTableColumn("priceBand", "Price"),
        new CmsTableColumn("displayOrder", "Display Order"),
        new CmsTableColumn("updatedAt", "Updated At"),
      ],
      "No sub packages found",
      "Create sub packages under main package groups.",
    ),
    "visa-destinations": CmsSectionCatalog.createSection(
      "visa-destinations",
      "Visa Network",
      "Visa Destinations",
      "Manage visa destinations.",
      "Create Visa Destination",
      [
        new CmsTableColumn("country", "Country", true),
        new CmsTableColumn("slug", "Slug"),
        new CmsTableColumn("processingTime", "Processing Time"),
        new CmsTableColumn("supportInfo", "Support"),
        new CmsTableColumn("heroReady", "Hero Ready"),
        new CmsTableColumn("status", "Status"),
      ],
      "No visa destinations found",
      "Create visa destinations to populate the visa website section.",
    ),
    "visa-details": CmsSectionCatalog.createSection(
      "visa-details",
      "Compliance Content",
      "Visa Details",
      "Manage visa detail blocks by destination.",
      "Add Visa Detail",
      [
        new CmsTableColumn("destination", "Destination", true),
        new CmsTableColumn("sectionType", "Section Type"),
        new CmsTableColumn("label", "Label"),
        new CmsTableColumn("value", "Value"),
        new CmsTableColumn("displayOrder", "Display Order"),
        new CmsTableColumn("updatedAt", "Updated At"),
      ],
      "No visa details found",
      "Create visa details for each active visa destination.",
    ),
    "creative-toolkit": CmsSectionCatalog.createSection(
      "creative-toolkit",
      "Creative Assets",
      "Creative Toolkit",
      "Manage featured picks shown on website experience sections.",
      "Create Featured Pick",
      [
        new CmsTableColumn("asset", "Asset", true),
        new CmsTableColumn("category", "Category"),
        new CmsTableColumn("reference", "Reference"),
        new CmsTableColumn("priceHook", "Offer"),
        new CmsTableColumn("badge", "Badge"),
        new CmsTableColumn("status", "Status"),
      ],
      "No featured picks found",
      "Create featured picks for hot deals and campaign placements.",
    ),
    "destination-map": CmsSectionCatalog.createSection(
      "destination-map",
      "Season Cards",
      "Destination Map",
      "Manage season cards connected to destinations.",
      "Create Season Card",
      [
        new CmsTableColumn("cluster", "Destination", true),
        new CmsTableColumn("destinations", "Title"),
        new CmsTableColumn("mainPackages", "From Month"),
        new CmsTableColumn("subPackages", "To Month"),
        new CmsTableColumn("coverage", "Tag"),
        new CmsTableColumn("status", "Status"),
      ],
      "No season cards found",
      "Create season cards to power climate and season website sections.",
    ),
  };

  public static getByKey(key: CmsSectionKey): CmsSectionViewModel {
    return CmsSectionCatalog.sections[key];
  }
}

export { CmsSectionCatalog };
