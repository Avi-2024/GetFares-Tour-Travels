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
        new CmsTableColumn("category", "Category"),
        new CmsTableColumn("seo", "SEO"),
        new CmsTableColumn("status", "Status"),
      ],
      "No destinations found",
      "Create destinations to populate website destination pages.",
    ),
    "published-packages": CmsSectionCatalog.createSection(
      "published-packages",
      "Package Catalog",
      "Packages",
      "Create and manage package inventory.",
      "Add Package",
      [
        new CmsTableColumn("package", "Package", true),
        new CmsTableColumn("destination", "Destination"),
        new CmsTableColumn("price", "Price"),
        new CmsTableColumn("publishState", "Published"),
        new CmsTableColumn("crmState", "Status"),
        new CmsTableColumn("syncAt", "Updated At"),
      ],
      "No packages found",
      "Create package records to manage website catalog.",
    ),
    "main-packages": CmsSectionCatalog.createSection(
      "main-packages",
      "Package Architecture",
      "Main Packages",
      "Manage curated main package records.",
      "Create Main Package",
      [
        new CmsTableColumn("title", "Title", true),
        new CmsTableColumn("amount", "Amount"),
        new CmsTableColumn("destination", "Destination"),
        new CmsTableColumn("country", "Country"),
        new CmsTableColumn("displayOrder", "Display Order"),
        new CmsTableColumn("featured", "Featured"),
      ],
      "No main packages found",
      "Create first main package to start catalog.",
    ),
    "sub-packages": CmsSectionCatalog.createSection(
      "sub-packages",
      "Modular Itineraries",
      "Sub Packages",
      "Manage sub-package variants.",
      "Create Sub Package",
      [
        new CmsTableColumn("variant", "Package", true),
        new CmsTableColumn("mainPackage", "Main Package"),
        new CmsTableColumn("displayOrder", "Display Order"),
        new CmsTableColumn("updatedAt", "Updated At"),
      ],
      "No sub packages found",
      "Create sub packages under main packages.",
    ),
    "visa-destinations": CmsSectionCatalog.createSection(
      "visa-destinations",
      "Visa Network",
      "Visa Destinations",
      "Manage visa destinations.",
      "Create Visa Destination",
      [
        new CmsTableColumn("title", "Title", true),
        new CmsTableColumn("country", "Country"),
        new CmsTableColumn("slug", "Slug"),
        new CmsTableColumn("overview", "Overview"),
        new CmsTableColumn("quickSupport", "Quick Support"),
        new CmsTableColumn("status", "Status"),
      ],
      "No visa destinations found",
      "Create visa destinations to populate the visa website section.",
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
        new CmsTableColumn("originalOffer", "Original Offer"),
        new CmsTableColumn("discountedOffer", "Discounted Offer"),
        new CmsTableColumn("badge", "Badge"),
        new CmsTableColumn("status", "Status"),
      ],
      "No featured picks found",
      "Create featured picks for hot deals and campaign placements.",
    ),
  };

  public static getByKey(key: CmsSectionKey): CmsSectionViewModel {
    return CmsSectionCatalog.sections[key];
  }
}

export { CmsSectionCatalog };
