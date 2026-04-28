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
  | "list-text"
  | "list-object"
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
  meta?: Record<string, unknown>;
}

interface CmsListObjectField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number";
  placeholder?: string;
}

interface CmsEntityFieldDefinition {
  key: string;
  label: string;
  type: CmsFieldType;
  required?: boolean;
  defaultValue?: string | number | boolean | string[];
  placeholder?: string;
  helperText?: string;
  options?: CmsFieldOption[];
  relationSource?: RelationSourceKey;
  itemFields?: CmsListObjectField[];
  addLabel?: string;
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
  private static destinationRegionOptions: CmsFieldOption[] = [
    { label: "All", value: "All" },
    { label: "Asia", value: "Asia" },
    { label: "Europe", value: "Europe" },
    { label: "Africa", value: "Africa" },
    { label: "Middle East", value: "Middle East" },
    { label: "Americas", value: "Americas" },
  ];

  private static destinationCategoryOptions: CmsFieldOption[] = [
    { label: "All", value: "all" },
    { label: "Honeymoon", value: "honeymoon" },
    { label: "Family", value: "family" },
    { label: "Adventure", value: "adventure" },
    { label: "Cultural", value: "cultural" },
  ];

  private static destinationSeasonOptions: CmsFieldOption[] = [
    { label: "All", value: "All" },
    { label: "Spring", value: "spring" },
    { label: "Summer", value: "summer" },
    { label: "Autumn", value: "autumn" },
    { label: "Winter", value: "winter" },
    { label: "Monsoon", value: "monsoon" },
    { label: "All Season", value: "all" },
  ];

  private static currencyOptions: CmsFieldOption[] = [
    { label: "🇮🇳 INR", value: "INR" },
    { label: "🇦🇪 AED", value: "AED" },
    { label: "🇺🇸 USD", value: "USD" },
    { label: "🇪🇺 EUR", value: "EUR" },
    { label: "🇬🇧 GBP", value: "GBP" },
  ];

  private static countryOptions: CmsFieldOption[] = [
    "Global",
    "United Arab Emirates",
    "India",
    // "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
    // "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain",
    // "Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
    // "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria",
    // "Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada",
    // "Central African Republic","Chad","Chile","China","Colombia","Comoros",
    // "Congo (Congo-Brazzaville)","Costa Rica","Croatia","Cuba","Cyprus",
    // "Czechia (Czech Republic)","Côte d’Ivoire","Denmark","Djibouti","Dominica",
    // "Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea",
    // "Eritrea","Estonia","Eswatini (fmr. Swaziland)","Ethiopia","Fiji","Finland",
    // "France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada",
    // "Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary",
    // "Iceland","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
    // "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait",
    // "Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya",
    // "Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia",
    // "Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius",
    // "Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
    // "Mozambique","Myanmar (formerly Burma)","Namibia","Nauru","Nepal",
    // "Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea",
    // "North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State",
    // "Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland",
    // "Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis",
    // "Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
    // "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles",
    // "Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia",
    // "South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan",
    // "Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania",
    // "Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia",
    // "Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine",
    // "United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu",
    // "Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
  ].map((country) => ({ label: country, value: country }));

  private static sectionByKey: Record<CmsSectionKey, CmsEntityFormDefinition> =
    {
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
          {
            key: "country",
            label: "Country",
            type: "select",
            options: CmsEntityFormCatalog.countryOptions,
            groupKey: "basic",
            helperText:
              "Optional when landing places are not configured country-wise.",
          },
          {
            key: "name",
            label: "Title",
            type: "text",
            required: true,
            groupKey: "basic",
          },
          { key: "tag", label: "Tag", type: "text", groupKey: "basic" },
          {
            key: "imageUrl",
            label: "Img",
            type: "url",
            required: true,
            groupKey: "basic",
          },
          {
            key: "description",
            label: "Description",
            type: "textarea",
            required: true,
            groupKey: "content",
          },
          {
            key: "displayOrder",
            label: "Display Order",
            type: "select",
            groupKey: "status",
            options: Array.from({ length: 4 }, (_, i) => ({
              label: String(i + 1),
              value: String(i + 1),
            })),
          },
          {
            key: "isActive",
            label: "Active",
            type: "switch",
            groupKey: "status",
          },
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
            key: "status",
            title: "Status / Visibility",
            description: "Featured flags and publish settings.",
            columns: 2,
            collapsible: true,
          },
        ],
        fields: [
          {
            key: "country",
            label: "Country",
            type: "select",
            options: CmsEntityFormCatalog.countryOptions,
            required: true,
            groupKey: "basic",
          },
          {
            key: "name",
            label: "Destination Name",
            type: "text",
            required: true,
            groupKey: "basic",
          },
          {
            key: "slug",
            label: "Slug",
            type: "text",
            required: true,
            groupKey: "basic",
            autoSlugSource: "name",
          },
          {
            key: "region",
            label: "Region",
            type: "select",
            options: CmsEntityFormCatalog.destinationRegionOptions,
            required: true,
            groupKey: "basic",
          },
          {
            key: "categories",
            label: "Category",
            type: "multi-select",
            options: CmsEntityFormCatalog.destinationCategoryOptions,
            required: true,
            groupKey: "basic",
          },
          {
            key: "seasonFocus",
            label: "Season Focus",
            type: "multi-select",
            options: CmsEntityFormCatalog.destinationSeasonOptions,
            groupKey: "basic",
          },
          { key: "rating", label: "Rating", type: "number", groupKey: "basic" },
          {
            key: "shortDescription",
            label: "Short Description",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "description",
            label: "Description",
            type: "textarea",
            required: true,
            groupKey: "content",
          },
          {
            key: "keyHighlights",
            label: "Key Highlights",
            type: "list-text",
            groupKey: "content",
            addLabel: "Add Highlight",
          },
          {
            key: "services",
            label: "Services",
            type: "list-object",
            groupKey: "content",
            addLabel: "Add Service",
            itemFields: [
              { key: "title", label: "Title" },
              { key: "description", label: "Description", type: "textarea" },
            ],
          },
          {
            key: "bestTimeToVisit",
            label: "Best Time To Visit",
            type: "list-object",
            groupKey: "content",
            addLabel: "Add Time Card",
            itemFields: [
              { key: "iconName", label: "Icon Name" },
              { key: "color", label: "Color (Hex)" },
              { key: "title", label: "Title" },
              { key: "from", label: "From" },
              { key: "to", label: "To" },
              { key: "description", label: "Description", type: "textarea" },
              { key: "suggestion", label: "Suggestion", type: "textarea" },
            ],
          },
          {
            key: "metaTitle",
            label: "Meta Title",
            type: "text",
            groupKey: "seo",
          },
          {
            key: "metaDescription",
            label: "Meta Description",
            type: "textarea",
            groupKey: "seo",
          },
          {
            key: "isPopular",
            label: "Featured",
            type: "switch",
            groupKey: "status",
          },
          {
            key: "isNew",
            label: "Mark As New",
            type: "switch",
            groupKey: "status",
          },
          {
            key: "isActive",
            label: "Active",
            type: "switch",
            groupKey: "status",
          },
        ],
      },
      "published-packages": {
        sectionKey: "published-packages",
        createSize: "5xl",
        editSize: "5xl",
        viewSize: "5xl",
        supportsCreate: false,
        supportsEdit: true,
        supportsDelete: true,
        titleKey: "name",
        subtitleKey: "destination",
        statusKey: "publishToWebsite",
        descriptionKey: "metaDescription",
        mediaEnabled: true,
        groups: [
          {
            key: "basic",
            title: "Basic Information",
            description: "Primary package identity and travel summary fields.",
            columns: 2,
          },
          {
            key: "content",
            title: "Content Details",
            description: "Website-facing descriptions and trip information.",
            columns: 2,
          },
          {
            key: "seo",
            title: "SEO",
            description: "Website meta fields and keywords.",
            columns: 2,
            collapsible: true,
          },
          {
            key: "status",
            title: "Status / Visibility",
            description: "Publishing controls and product availability.",
            columns: 2,
            collapsible: true,
          },
        ],
        fields: [
          {
            key: "name",
            label: "Package Name",
            type: "text",
            required: true,
            groupKey: "basic",
          },
          {
            key: "destinationId",
            label: "Destination",
            type: "searchable-select",
            relationSource: "destinations",
            required: true,
            groupKey: "basic",
          },
          {
            key: "duration",
            label: "Duration",
            type: "text",
            groupKey: "basic",
          },
          {
            key: "startingPriceCurrency",
            label: "Currency",
            type: "select",
            options: CmsEntityFormCatalog.currencyOptions,
            defaultValue: "INR",
            groupKey: "basic",
          },
          {
            key: "startingPrice",
            label: "Starting Price",
            type: "number",
            groupKey: "basic",
          },
          {
            key: "description",
            label: "Description",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "highlights",
            label: "Highlights",
            type: "list-text",
            groupKey: "content",
            addLabel: "Add Highlight",
          },
          {
            key: "inclusions",
            label: "Inclusions",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "exclusions",
            label: "Exclusions",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "hotelDetails",
            label: "Hotel Details",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "packageCategory",
            label: "Package Category",
            type: "text",
            groupKey: "content",
          },
          {
            key: "validFrom",
            label: "Valid From",
            type: "date",
            groupKey: "content",
          },
          {
            key: "validTo",
            label: "Valid To",
            type: "date",
            groupKey: "content",
          },
          {
            key: "metaTitle",
            label: "Meta Title",
            type: "text",
            groupKey: "seo",
          },
          {
            key: "metaDescription",
            label: "Meta Description",
            type: "textarea",
            groupKey: "seo",
          },
          {
            key: "keywords",
            label: "Keywords",
            type: "text",
            groupKey: "seo",
            helperText: "Comma separated keywords for SEO.",
          },
          {
            key: "bannerImageUrl",
            label: "Banner Image URL",
            type: "url",
            groupKey: "status",
          },
          {
            key: "publishToWebsite",
            label: "Publish To Website",
            type: "switch",
            defaultValue: false,
            groupKey: "status",
          },
          {
            key: "websiteSlug",
            label: "Website Slug",
            type: "text",
            groupKey: "status",
            autoSlugSource: "name",
            helperText: "Required when package is published.",
          },
          {
            key: "isSoldOut",
            label: "Sold Out",
            type: "switch",
            defaultValue: false,
            groupKey: "status",
          },
        ],
      },
      "main-packages": {
        sectionKey: "main-packages",
        createSize: "5xl",
        editSize: "5xl",
        viewSize: "5xl",
        supportsCreate: true,
        supportsEdit: true,
        supportsDelete: true,
        titleKey: "title",
        subtitleKey: "destination",
        statusKey: "isFeatured",
        descriptionKey: "amount",
        mediaEnabled: true,
        groups: [
          {
            key: "basic",
            title: "Basic Information",
            description: "Parent package info.",
            columns: 2,
          },
          {
            key: "content",
            title: "Content",
            description: "Features and inclusions.",
            columns: 2,
          },
          {
            key: "seo",
            title: "SEO",
            description: "Search metadata.",
            columns: 2,
            collapsible: true,
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
            key: "country",
            label: "Country",
            type: "select",
            options: CmsEntityFormCatalog.countryOptions,
            groupKey: "basic",
          },
          {
            key: "title",
            label: "Title",
            type: "text",
            required: true,
            groupKey: "basic",
          },
          {
            key: "amountCurrency",
            label: "Currency",
            type: "select",
            options: CmsEntityFormCatalog.currencyOptions,
            defaultValue: "INR",
            groupKey: "basic",
          },
          {
            key: "amount",
            label: "Amount",
            type: "number",
            required: true,
            groupKey: "basic",
          },
          {
            key: "destinationId",
            label: "Destination",
            type: "searchable-select",
            relationSource: "destinations",
            groupKey: "basic",
            helperText:
              "Optional. Parent package can exist without destination.",
          },
          {
            key: "description",
            label: "Description",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "highlights",
            label: "Highlights",
            type: "list-text",
            groupKey: "content",
            addLabel: "Add Highlight",
          },
          {
            key: "features",
            label: "Features",
            type: "list-object",
            groupKey: "content",
            addLabel: "Add Feature",
            itemFields: [
              { key: "iconName", label: "Icon Name" },
              { key: "description", label: "Description", type: "textarea" },
            ],
          },
          {
            key: "inclusions",
            label: "Inclusions",
            type: "list-object",
            groupKey: "content",
            addLabel: "Add Inclusion",
            itemFields: [
              { key: "iconName", label: "Icon Name" },
              { key: "description", label: "Description", type: "textarea" },
            ],
          },
          {
            key: "metaTitle",
            label: "Meta Title",
            type: "text",
            groupKey: "seo",
          },
          {
            key: "metaDescription",
            label: "Meta Description",
            type: "textarea",
            groupKey: "seo",
          },
          { key: "keywords", label: "Keywords", type: "text", groupKey: "seo" },
          {
            key: "displayOrder",
            label: "Display Order",
            type: "number",
            groupKey: "status",
          },
          {
            key: "isFeatured",
            label: "Featured",
            type: "switch",
            groupKey: "status",
          },
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
        titleKey: "title",
        subtitleKey: "duration",
        descriptionKey: "description",
        mediaEnabled: false,
        groups: [
          {
            key: "basic",
            title: "Basic Information",
            description: "Sub package details.",
            columns: 2,
          },
          {
            key: "content",
            title: "Content",
            description: "Narrative and itinerary.",
            columns: 2,
          },
          {
            key: "lists",
            title: "Lists",
            description: "Highlights and policy lists.",
            columns: 2,
          },
          {
            key: "seo",
            title: "SEO",
            description: "Search metadata.",
            columns: 2,
            collapsible: true,
          },
        ],
        fields: [
          {
            key: "country",
            label: "Country",
            type: "select",
            options: CmsEntityFormCatalog.countryOptions,
            groupKey: "basic",
            helperText: "Filter parent packages by country.",
          },
          {
            key: "mainPackageId",
            label: "Parent Package",
            type: "searchable-select",
            relationSource: "main-packages",
            required: true,
            groupKey: "basic",
            helperText: "Select a parent package.",
          },
          {
            key: "title",
            label: "Title",
            type: "text",
            required: true,
            groupKey: "basic",
          },
          {
            key: "image",
            label: "Image",
            type: "url",
            required: true,
            groupKey: "basic",
          },
          {
            key: "rating",
            label: "Rating",
            type: "number",
            groupKey: "basic",
            defaultValue: 0,
          },
          {
            key: "location",
            label: "Location",
            type: "text",
            groupKey: "basic",
          },
          {
            key: "durationDays",
            label: "Duration Days",
            type: "number",
            groupKey: "basic",
          },
          {
            key: "durationNights",
            label: "Duration Nights",
            type: "number",
            groupKey: "basic",
          },
          {
            key: "startingPriceCurrency",
            label: "Currency",
            type: "select",
            options: CmsEntityFormCatalog.currencyOptions,
            defaultValue: "INR",
            groupKey: "basic",
          },
          {
            key: "startingPrice",
            label: "Starting Price",
            type: "number",
            groupKey: "basic",
          },
          {
            key: "transport",
            label: "Transport",
            type: "text",
            groupKey: "basic",
          },
          {
            key: "description",
            label: "Description",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "snapshot",
            label: "Snapshot",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "features",
            label: "Features",
            type: "list-object",
            groupKey: "content",
            addLabel: "Add Feature",
            itemFields: [
              { key: "title", label: "Title" },
              { key: "description", label: "Description", type: "textarea" },
            ],
          },
          {
            key: "itineraries",
            label: "Itineraries",
            type: "list-object",
            groupKey: "content",
            addLabel: "Add Itinerary Day",
            itemFields: [
              { key: "day", label: "Day", type: "number" },
              { key: "title", label: "Title" },
              { key: "description", label: "Description", type: "textarea" },
              {
                key: "features",
                label: "Features (comma separated)",
                type: "text",
                placeholder: "feature 1, feature 2, feature 3",
              },
            ],
          },
          {
            key: "highlights",
            label: "Highlights",
            type: "list-text",
            groupKey: "lists",
            addLabel: "Add Highlight",
          },
          {
            key: "inclusions",
            label: "Inclusions",
            type: "list-text",
            groupKey: "lists",
            addLabel: "Add Inclusion",
          },
          {
            key: "exclusions",
            label: "Exclusions",
            type: "list-text",
            groupKey: "lists",
            addLabel: "Add Exclusion",
          },
          {
            key: "paymentTerms",
            label: "Payment Terms",
            type: "list-text",
            groupKey: "lists",
            addLabel: "Add Term",
          },
          {
            key: "cancellationPolicy",
            label: "Cancellation Policy",
            type: "list-text",
            groupKey: "lists",
            addLabel: "Add Policy",
          },
          {
            key: "tnc",
            label: "T&C",
            type: "list-text",
            groupKey: "lists",
            addLabel: "Add T&C Point",
          },
          {
            key: "impNotes",
            label: "Important Notes",
            type: "list-text",
            groupKey: "lists",
            addLabel: "Add Note",
          },
          {
            key: "metaTitle",
            label: "Meta Title",
            type: "text",
            groupKey: "seo",
          },
          {
            key: "metaDescription",
            label: "Meta Description",
            type: "textarea",
            groupKey: "seo",
          },
          { key: "keywords", label: "Keywords", type: "text", groupKey: "seo" },
          {
            key: "displayOrder",
            label: "Display Order",
            type: "number",
            groupKey: "basic",
          },
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
            description: "Card identity and top summary content.",
            columns: 2,
          },
          {
            key: "content",
            title: "Content Details",
            description: "Overview, support, requirements, and visa details.",
            columns: 2,
          },
          {
            key: "seo",
            title: "SEO",
            description: "Search metadata for website detail page.",
            columns: 2,
            collapsible: true,
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
          {
            key: "country",
            label: "Country",
            type: "select",
            options: CmsEntityFormCatalog.countryOptions,
            required: true,
            groupKey: "basic",
          },
          {
            key: "title",
            label: "Title",
            type: "text",
            required: true,
            groupKey: "basic",
          },
          {
            key: "slug",
            label: "Slug",
            type: "text",
            required: true,
            groupKey: "basic",
            autoSlugSource: "title",
          },
          {
            key: "imageUrl",
            label: "Image URL",
            type: "url",
            required: true,
            groupKey: "basic",
          },
          {
            key: "priceCurrency",
            label: "Price Currency",
            type: "select",
            options: CmsEntityFormCatalog.currencyOptions,
            defaultValue: "INR",
            groupKey: "basic",
          },
          {
            key: "priceAmount",
            label: "Price Amount",
            type: "number",
            groupKey: "basic",
          },
          {
            key: "subDescription",
            label: "Short Description",
            type: "textarea",
            groupKey: "basic",
          },
          {
            key: "highlights",
            label: "Highlights",
            type: "list-text",
            groupKey: "content",
            addLabel: "Add Highlight",
          },
          {
            key: "overviewTitle",
            label: "Overview Title",
            type: "text",
            groupKey: "content",
          },
          {
            key: "overviewDescription",
            label: "Overview Description",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "quickSupportTitle",
            label: "Quick Support Title",
            type: "text",
            groupKey: "content",
          },
          {
            key: "quickSupportDescription",
            label: "Quick Support Description",
            type: "textarea",
            groupKey: "content",
          },
          {
            key: "supportIncluded",
            label: "Support Included",
            type: "list-text",
            groupKey: "content",
            addLabel: "Add Support Item",
          },
          {
            key: "visaDetails",
            label: "Visa Details",
            type: "list-object",
            groupKey: "content",
            addLabel: "Add Visa Detail",
            itemFields: [
              { key: "title", label: "Title" },
              { key: "description", label: "Description", type: "textarea" },
            ],
          },
          {
            key: "requirements",
            label: "Requirements",
            type: "list-text",
            groupKey: "content",
            addLabel: "Add Requirement",
          },
          {
            key: "metaTitle",
            label: "Meta Title",
            type: "text",
            groupKey: "seo",
          },
          {
            key: "metaDescription",
            label: "Meta Description",
            type: "textarea",
            groupKey: "seo",
          },
          { key: "keywords", label: "Keywords", type: "text", groupKey: "seo" },
          {
            key: "displayOrder",
            label: "Display Order",
            type: "number",
            groupKey: "status",
          },
          {
            key: "isActive",
            label: "Active",
            type: "switch",
            groupKey: "status",
          },
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
          {
            key: "country",
            label: "Country",
            type: "select",
            options: CmsEntityFormCatalog.countryOptions,
            groupKey: "basic",
          },
          {
            key: "title",
            label: "Title",
            type: "text",
            required: true,
            groupKey: "basic",
          },
          {
            key: "slug",
            label: "Slug",
            type: "text",
            required: true,
            groupKey: "basic",
            autoSlugSource: "title",
          },
          {
            key: "subtitle",
            label: "Subtitle",
            type: "text",
            groupKey: "basic",
          },
          {
            key: "category",
            label: "Category",
            type: "select",
            required: true,
            groupKey: "basic",
            options: [
              { label: "Package", value: "package" },
              { label: "Destination", value: "destination" },
              { label: "Visa Service", value: "visa_service" },
            ],
          },
          {
            key: "referenceId",
            label: "Reference",
            type: "searchable-select",
            relationSource: "featured-references",
            groupKey: "basic",
          },
          {
            key: "campaignType",
            label: "Campaign Type",
            type: "select",
            groupKey: "basic",
            options: [
              { label: "Featured", value: "featured" },
              { label: "Early Bird", value: "early_bird" },
            ],
          },
          {
            key: "sectionKey",
            label: "Section Key",
            type: "select",
            groupKey: "basic",
            options: [
              { label: "Featured Hot Picks", value: "featured-hot-picks" },
              { label: "Early Bird Offers", value: "early-bird-offers" },
            ],
          },
          {
            key: "description",
            label: "Description",
            type: "textarea",
            required: true,
            groupKey: "content",
          },
          {
            key: "duration",
            label: "Duration",
            type: "text",
            groupKey: "content",
          },
          {
            key: "badgeText",
            label: "Badge Text",
            type: "text",
            groupKey: "content",
          },
          {
            key: "buttonText",
            label: "Button Text",
            type: "text",
            groupKey: "content",
          },
          {
            key: "tags",
            label: "Tags",
            type: "multi-select",
            groupKey: "content",
            options: [
              { label: "Flights Included", value: "Flights Included" },
              { label: "Family Friendly", value: "Family Friendly" },
              { label: "Best Seller", value: "Best Seller" },
              { label: "Express", value: "Express" },
            ],
          },
          {
            key: "highlights",
            label: "Highlights",
            type: "multi-select",
            groupKey: "content",
            options: [
              { label: "Fast Processing", value: "Fast Processing" },
              { label: "Limited Slots", value: "Limited Slots" },
              { label: "Premium Stay", value: "Premium Stay" },
            ],
          },
          {
            key: "rating",
            label: "Rating",
            type: "number",
            groupKey: "pricing",
          },
          {
            key: "offerCurrency",
            label: "Offer Currency",
            type: "select",
            options: CmsEntityFormCatalog.currencyOptions,
            defaultValue: "INR",
            groupKey: "pricing",
          },
          {
            key: "originalPrice",
            label: "Original Price",
            type: "number",
            groupKey: "pricing",
          },
          {
            key: "discountedPrice",
            label: "Discounted Price",
            type: "number",
            groupKey: "pricing",
          },
          {
            key: "expiresOn",
            label: "Expires On",
            type: "date",
            groupKey: "pricing",
          },
          {
            key: "displayOrder",
            label: "Display Order",
            type: "number",
            groupKey: "status",
          },
          {
            key: "isActive",
            label: "Active",
            type: "switch",
            groupKey: "status",
          },
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
