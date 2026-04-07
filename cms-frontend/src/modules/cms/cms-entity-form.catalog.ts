import type { CmsSectionKey } from "./cms-section.models";

type CmsModalSize = "2xl" | "4xl" | "5xl";
type CmsFieldType =
  | "text"
  | "textarea"
  | "number"
  | "url"
  | "date"
  | "select"
  | "searchable-select"
  | "multi-select"
  | "switch";

type RelationSourceKey =
  | "destinations"
  | "published-packages"
  | "main-packages"
  | "visa-destinations"
  | "featured-references";

interface CmsFieldOption {
  label: string;
  value: string;
}

interface CmsEntityFieldDefinition {
  key: string;
  label: string;
  type: CmsFieldType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: CmsFieldOption[];
  relationSource?: RelationSourceKey;
  groupKey: string;
  autoSlugSource?: string;
}

interface CmsEntityGroupDefinition {
  key: string;
  title: string;
  description: string;
  columns?: 1 | 2;
  collapsible?: boolean;
}

interface CmsEntityFormDefinition {
  sectionKey: CmsSectionKey;
  createSize: CmsModalSize;
  editSize: CmsModalSize;
  viewSize: CmsModalSize;
  supportsCreate: boolean;
  supportsEdit: boolean;
  supportsDelete: boolean;
  titleKey: string;
  subtitleKey?: string;
  statusKey?: string;
  descriptionKey?: string;
  groups: CmsEntityGroupDefinition[];
  fields: CmsEntityFieldDefinition[];
  mediaEnabled: boolean;
}

class CmsEntityFormCatalog {
  private static monthOptions: CmsFieldOption[] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ].map((month) => ({ label: month, value: month }));

  private static destinationRegionOptions: CmsFieldOption[] = [
    { label: "Asia", value: "Asia" },
    { label: "Europe", value: "Europe" },
    { label: "Africa", value: "Africa" },
    { label: "Middle East", value: "Middle East" },
    { label: "Americas", value: "Americas" },
  ];

  private static destinationCategoryOptions: CmsFieldOption[] = [
    { label: "Luxury", value: "Luxury" },
    { label: "Culture", value: "Culture" },
    { label: "Family", value: "Family" },
    { label: "Adventure", value: "Adventure" },
    { label: "Safari", value: "Safari" },
    { label: "Budget", value: "Budget" },
  ];

  private static destinationTravelTypeOptions: CmsFieldOption[] = [
    { label: "Leisure", value: "Leisure" },
    { label: "Luxury", value: "Luxury" },
    { label: "Culture", value: "Culture" },
    { label: "Safari", value: "Safari" },
    { label: "Adventure", value: "Adventure" },
  ];

  private static sectionByKey: Record<CmsSectionKey, CmsEntityFormDefinition> = {
    "landing-places": {
      sectionKey: "landing-places",
      createSize: "4xl",
      editSize: "4xl",
      viewSize: "4xl",
      supportsCreate: true,
      supportsEdit: true,
      supportsDelete: true,
      titleKey: "name",
      subtitleKey: "tag",
      statusKey: "isActive",
      descriptionKey: "description",
      mediaEnabled: false,
      groups: [
        {
          key: "basic",
          title: "Basic Information",
          description: "Landing place title, tag, and image details.",
          columns: 2,
        },
        {
          key: "content",
          title: "Content",
          description: "Short supporting copy for the landing tile.",
          columns: 1,
        },
        {
          key: "status",
          title: "Status / Visibility",
          description: "Display order and publish controls.",
          columns: 2,
          collapsible: true,
        },
      ],
      fields: [
        { key: "name", label: "Title", type: "text", required: true, groupKey: "basic" },
        { key: "country", label: "Country", type: "text", groupKey: "basic", helperText: "Optional when landing places are not configured country-wise." },
        { key: "tag", label: "Tag", type: "text", groupKey: "basic" },
        { key: "imageUrl", label: "Img", type: "url", required: true, groupKey: "basic" },
        { key: "description", label: "Description", type: "textarea", required: true, groupKey: "content" },
        { key: "displayOrder", label: "Display Order", type: "number", required: true, groupKey: "status" },
        { key: "isActive", label: "Active", type: "switch", groupKey: "status" },
      ],
    },
    destinations: {
      sectionKey: "destinations",
      createSize: "5xl",
      editSize: "5xl",
      viewSize: "5xl",
      supportsCreate: true,
      supportsEdit: true,
      supportsDelete: true,
      titleKey: "name",
      subtitleKey: "country",
      statusKey: "isActive",
      descriptionKey: "description",
      mediaEnabled: true,
      groups: [
        {
          key: "basic",
          title: "Basic Information",
          description: "Core destination profile and categorization.",
          columns: 2,
        },
        {
          key: "content",
          title: "Content Details",
          description: "Destination summaries and story content.",
          columns: 2,
        },
        {
          key: "seo",
          title: "SEO",
          description: "Search metadata for public website pages.",
          columns: 2,
          collapsible: true,
        },
        {
          key: "relations",
          title: "Relations / References",
          description: "Map destination to package groups.",
          columns: 1,
          collapsible: true,
        },
        {
          key: "status",
          title: "Status / Visibility",
          description: "Featured flags and publish settings.",
          columns: 2,
          collapsible: true,
        },
      ],
      fields: [
        { key: "name", label: "Destination Name", type: "text", required: true, groupKey: "basic" },
        { key: "slug", label: "Slug", type: "text", required: true, groupKey: "basic", autoSlugSource: "name" },
        { key: "country", label: "Country", type: "text", required: true, groupKey: "basic" },
        { key: "region", label: "Region", type: "select", options: CmsEntityFormCatalog.destinationRegionOptions, required: true, groupKey: "basic" },
        { key: "category", label: "Category", type: "select", options: CmsEntityFormCatalog.destinationCategoryOptions, required: true, groupKey: "basic" },
        { key: "travelType", label: "Travel Type", type: "select", options: CmsEntityFormCatalog.destinationTravelTypeOptions, groupKey: "basic" },
        { key: "season", label: "Season Focus", type: "select", options: CmsEntityFormCatalog.monthOptions, groupKey: "basic" },
        { key: "rating", label: "Rating", type: "number", groupKey: "basic" },
        { key: "shortDescription", label: "Short Description", type: "textarea", groupKey: "content" },
        { key: "description", label: "Description", type: "textarea", required: true, groupKey: "content" },
        { key: "metaTitle", label: "Meta Title", type: "text", groupKey: "seo" },
        { key: "metaDescription", label: "Meta Description", type: "textarea", groupKey: "seo" },
        { key: "relatedMainPackageIds", label: "Related Main Packages", type: "multi-select", relationSource: "main-packages", groupKey: "relations" },
        { key: "isPopular", label: "Featured / Popular", type: "switch", groupKey: "status" },
        { key: "isNew", label: "Mark As New", type: "switch", groupKey: "status" },
        { key: "isActive", label: "Active", type: "switch", groupKey: "status" },
      ],
    },
    "published-packages": {
      sectionKey: "published-packages",
      createSize: "2xl",
      editSize: "4xl",
      viewSize: "4xl",
      supportsCreate: false,
      supportsEdit: true,
      supportsDelete: false,
      titleKey: "name",
      subtitleKey: "destination",
      statusKey: "publishToWebsite",
      descriptionKey: "metaDescription",
      mediaEnabled: false,
      groups: [
        {
          key: "content",
          title: "Website Publishing",
          description: "Update publish state and website banner for this CRM package.",
          columns: 2,
        },
      ],
      fields: [
        {
          key: "bannerImageUrl",
          label: "Banner Image URL",
          type: "url",
          groupKey: "content",
        },
        {
          key: "publishToWebsite",
          label: "Publish To Website",
          type: "switch",
          groupKey: "content",
        },
      ],
    },
    "main-packages": {
      sectionKey: "main-packages",
      createSize: "4xl",
      editSize: "4xl",
      viewSize: "4xl",
      supportsCreate: true,
      supportsEdit: true,
      supportsDelete: true,
      titleKey: "packageName",
      subtitleKey: "destination",
      statusKey: "isFeatured",
      descriptionKey: "duration",
      mediaEnabled: true,
      groups: [
        {
          key: "basic",
          title: "Basic Information",
          description: "Parent package mapping configuration.",
          columns: 2,
        },
        {
          key: "status",
          title: "Status / Visibility",
          description: "Ordering and featured placement.",
          columns: 2,
        },
      ],
      fields: [
        {
          key: "packageId",
          label: "Published Package",
          type: "searchable-select",
          relationSource: "published-packages",
          required: true,
          groupKey: "basic",
          helperText: "If this list is empty, first publish a package in the Published Packages page.",
        },
        { key: "country", label: "Country", type: "text", required: true, groupKey: "basic" },
        { key: "displayOrder", label: "Display Order", type: "number", required: true, groupKey: "status" },
        { key: "isFeatured", label: "Featured", type: "switch", groupKey: "status" },
      ],
    },
    "sub-packages": {
      sectionKey: "sub-packages",
      createSize: "4xl",
      editSize: "4xl",
      viewSize: "4xl",
      supportsCreate: true,
      supportsEdit: true,
      supportsDelete: true,
      titleKey: "packageName",
      subtitleKey: "duration",
      descriptionKey: "duration",
      mediaEnabled: false,
      groups: [
        {
          key: "basic",
          title: "Basic Information",
          description: "Child package variant mapping.",
          columns: 2,
        },
      ],
      fields: [
        {
          key: "mainPackageId",
          label: "Main Package",
          type: "searchable-select",
          relationSource: "main-packages",
          required: true,
          groupKey: "basic",
          helperText: "Select a main package from the Main Packages admin list.",
        },
        {
          key: "packageId",
          label: "Published Package",
          type: "searchable-select",
          relationSource: "published-packages",
          required: true,
          groupKey: "basic",
          helperText: "Select a published CRM package to attach under the chosen main package.",
        },
        { key: "displayOrder", label: "Display Order", type: "number", required: true, groupKey: "basic" },
      ],
    },
    "visa-destinations": {
      sectionKey: "visa-destinations",
      createSize: "4xl",
      editSize: "4xl",
      viewSize: "4xl",
      supportsCreate: true,
      supportsEdit: true,
      supportsDelete: true,
      titleKey: "title",
      subtitleKey: "subtitle",
      statusKey: "isActive",
      descriptionKey: "description",
      mediaEnabled: true,
      groups: [
        {
          key: "basic",
          title: "Basic Information",
          description: "Visa listing card and primary info.",
          columns: 2,
        },
        {
          key: "content",
          title: "Content Details",
          description: "Support narrative and card metadata.",
          columns: 2,
        },
        {
          key: "status",
          title: "Status / Visibility",
          description: "Ordering and publishing controls.",
          columns: 2,
          collapsible: true,
        },
      ],
      fields: [
        { key: "title", label: "Country / Destination", type: "text", required: true, groupKey: "basic" },
        { key: "slug", label: "Slug", type: "text", required: true, groupKey: "basic", autoSlugSource: "title" },
        { key: "country", label: "Country", type: "text", required: true, groupKey: "basic" },
        { key: "subtitle", label: "Subtitle", type: "text", groupKey: "basic" },
        { key: "processingTime", label: "Processing Time", type: "text", required: true, groupKey: "content" },
        { key: "supportInfo", label: "Support Info", type: "textarea", groupKey: "content" },
        { key: "description", label: "Description", type: "textarea", required: true, groupKey: "content" },
        { key: "iconName", label: "Icon Name", type: "text", groupKey: "content" },
        { key: "highlights", label: "Highlights", type: "multi-select", groupKey: "content", options: [{ label: "Tourism", value: "Tourism" }, { label: "Family", value: "Family" }, { label: "Business", value: "Business" }, { label: "Express", value: "Express" }] },
        { key: "ctaText", label: "CTA Text", type: "text", groupKey: "content" },
        { key: "displayOrder", label: "Display Order", type: "number", required: true, groupKey: "status" },
        { key: "isActive", label: "Active", type: "switch", groupKey: "status" },
      ],
    },
    "visa-details": {
      sectionKey: "visa-details",
      createSize: "4xl",
      editSize: "4xl",
      viewSize: "4xl",
      supportsCreate: true,
      supportsEdit: true,
      supportsDelete: true,
      titleKey: "label",
      subtitleKey: "sectionType",
      statusKey: "sectionType",
      descriptionKey: "value",
      mediaEnabled: false,
      groups: [
        {
          key: "basic",
          title: "Basic Information",
          description: "Visa detail entry configuration.",
          columns: 2,
        },
      ],
      fields: [
        { key: "visaDestinationId", label: "Visa Destination", type: "searchable-select", relationSource: "visa-destinations", required: true, groupKey: "basic" },
        { key: "sectionType", label: "Section Type", type: "select", required: true, groupKey: "basic", options: [{ label: "Overview", value: "overview" }, { label: "Fact", value: "fact" }, { label: "Requirement", value: "requirement" }, { label: "Note", value: "note" }] },
        { key: "label", label: "Label", type: "text", required: true, groupKey: "basic" },
        { key: "value", label: "Value", type: "textarea", required: true, groupKey: "basic" },
        { key: "displayOrder", label: "Display Order", type: "number", required: true, groupKey: "basic" },
      ],
    },
    "creative-toolkit": {
      sectionKey: "creative-toolkit",
      createSize: "5xl",
      editSize: "5xl",
      viewSize: "5xl",
      supportsCreate: true,
      supportsEdit: true,
      supportsDelete: true,
      titleKey: "title",
      subtitleKey: "subtitle",
      statusKey: "isActive",
      descriptionKey: "description",
      mediaEnabled: true,
      groups: [
        {
          key: "basic",
          title: "Basic Information",
          description: "Campaign card metadata and targeting.",
          columns: 2,
        },
        {
          key: "content",
          title: "Content Details",
          description: "Creative text, tags, and highlights.",
          columns: 2,
        },
        {
          key: "pricing",
          title: "Pricing & Offer",
          description: "Offer pricing and expiry configuration.",
          columns: 2,
          collapsible: true,
        },
        {
          key: "status",
          title: "Status / Visibility",
          description: "Card placement and publish control.",
          columns: 2,
          collapsible: true,
        },
      ],
      fields: [
        { key: "title", label: "Title", type: "text", required: true, groupKey: "basic" },
        { key: "slug", label: "Slug", type: "text", required: true, groupKey: "basic", autoSlugSource: "title" },
        { key: "subtitle", label: "Subtitle", type: "text", groupKey: "basic" },
        { key: "country", label: "Country", type: "text", groupKey: "basic" },
        { key: "category", label: "Category", type: "select", required: true, groupKey: "basic", options: [{ label: "Package", value: "package" }, { label: "Destination", value: "destination" }, { label: "Visa Service", value: "visa_service" }] },
        { key: "referenceId", label: "Reference", type: "searchable-select", relationSource: "featured-references", groupKey: "basic" },
        { key: "campaignType", label: "Campaign Type", type: "select", groupKey: "basic", options: [{ label: "Featured", value: "featured" }, { label: "Early Bird", value: "early_bird" }] },
        { key: "sectionKey", label: "Section Key", type: "select", groupKey: "basic", options: [{ label: "Featured Hot Picks", value: "featured-hot-picks" }, { label: "Early Bird Offers", value: "early-bird-offers" }] },
        { key: "description", label: "Description", type: "textarea", required: true, groupKey: "content" },
        { key: "duration", label: "Duration", type: "text", groupKey: "content" },
        { key: "badgeText", label: "Badge Text", type: "text", groupKey: "content" },
        { key: "buttonText", label: "Button Text", type: "text", groupKey: "content" },
        { key: "ctaUrl", label: "CTA URL", type: "url", groupKey: "content" },
        { key: "tags", label: "Tags", type: "multi-select", groupKey: "content", options: [{ label: "Flights Included", value: "Flights Included" }, { label: "Family Friendly", value: "Family Friendly" }, { label: "Best Seller", value: "Best Seller" }, { label: "Express", value: "Express" }] },
        { key: "highlights", label: "Highlights", type: "multi-select", groupKey: "content", options: [{ label: "Fast Processing", value: "Fast Processing" }, { label: "Limited Slots", value: "Limited Slots" }, { label: "Premium Stay", value: "Premium Stay" }] },
        { key: "rating", label: "Rating", type: "number", groupKey: "pricing" },
        { key: "originalPrice", label: "Original Price", type: "number", groupKey: "pricing" },
        { key: "discountedPrice", label: "Discounted Price", type: "number", groupKey: "pricing" },
        { key: "expiresOn", label: "Expires On", type: "date", groupKey: "pricing" },
        { key: "displayOrder", label: "Display Order", type: "number", required: true, groupKey: "status" },
        { key: "isActive", label: "Active", type: "switch", groupKey: "status" },
      ],
    },
    "destination-map": {
      sectionKey: "destination-map",
      createSize: "4xl",
      editSize: "4xl",
      viewSize: "4xl",
      supportsCreate: true,
      supportsEdit: true,
      supportsDelete: true,
      titleKey: "title",
      subtitleKey: "destinationName",
      statusKey: "isActive",
      descriptionKey: "description",
      mediaEnabled: true,
      groups: [
        {
          key: "basic",
          title: "Basic Information",
          description: "Season card and destination mapping details.",
          columns: 2,
        },
        {
          key: "style",
          title: "Card Styling",
          description: "Tag and icon visual attributes.",
          columns: 2,
          collapsible: true,
        },
        {
          key: "status",
          title: "Status / Visibility",
          description: "Ordering and active state controls.",
          columns: 2,
          collapsible: true,
        },
      ],
      fields: [
        { key: "destinationId", label: "Destination", type: "searchable-select", relationSource: "destinations", required: true, groupKey: "basic" },
        { key: "title", label: "Season Title", type: "text", required: true, groupKey: "basic" },
        { key: "fromMonth", label: "From Month", type: "select", options: CmsEntityFormCatalog.monthOptions, required: true, groupKey: "basic" },
        { key: "toMonth", label: "To Month", type: "select", options: CmsEntityFormCatalog.monthOptions, required: true, groupKey: "basic" },
        { key: "description", label: "Description", type: "textarea", required: true, groupKey: "basic" },
        { key: "tag", label: "Tag", type: "text", groupKey: "style" },
        { key: "iconName", label: "Icon Name", type: "text", groupKey: "style" },
        { key: "iconColor", label: "Icon Color", type: "text", groupKey: "style", placeholder: "#16a34a" },
        { key: "bgColor", label: "Background Color", type: "text", groupKey: "style", placeholder: "#d1fae5" },
        { key: "displayOrder", label: "Display Order", type: "number", required: true, groupKey: "status" },
        { key: "isActive", label: "Active", type: "switch", groupKey: "status" },
      ],
    },
  };

  public static get(sectionKey: CmsSectionKey): CmsEntityFormDefinition {
    return CmsEntityFormCatalog.sectionByKey[sectionKey];
  }
}

export type {
  CmsModalSize,
  CmsFieldType,
  CmsFieldOption,
  CmsEntityFieldDefinition,
  CmsEntityGroupDefinition,
  CmsEntityFormDefinition,
  RelationSourceKey,
};
export { CmsEntityFormCatalog };
