import type { CmsSectionKey } from "./models/cms-section-key.type";

interface CmsRouteDefinition {
  path: string;
  sectionKey: CmsSectionKey;
  title: string;
  subtitle: string;
  breadcrumb: string;
}

const cmsRouteDefinitions: CmsRouteDefinition[] = [
  {
    path: "/cms/landing-places",
    sectionKey: "landing-places",
    title: "Landing Places",
    subtitle: "Manage hero cards, highlights, and storytelling entry points.",
    breadcrumb: "CMS / Landing Places",
  },
  {
    path: "/cms/destinations",
    sectionKey: "destinations",
    title: "Destinations",
    subtitle: "Curate regional content, gallery assets, and SEO layers.",
    breadcrumb: "CMS / Destinations",
  },
  {
    path: "/cms/packages/published",
    sectionKey: "published-packages",
    title: "Packages",
    subtitle: "Manage package inventory and website publishing state.",
    breadcrumb: "CMS / Packages",
  },
  {
    path: "/cms/packages/main",
    sectionKey: "main-packages",
    title: "Main Packages",
    subtitle: "Build high-level package narratives and featured blocks.",
    breadcrumb: "CMS / Packages / Main",
  },
  {
    path: "/cms/packages/sub",
    sectionKey: "sub-packages",
    title: "Sub Packages",
    subtitle: "Manage modular itinerary units nested under main packages.",
    breadcrumb: "CMS / Packages / Sub",
  },
  {
    path: "/cms/visa-destinations",
    sectionKey: "visa-destinations",
    title: "Visa Destinations",
    subtitle: "Organize visa destinations with country and regional grouping.",
    breadcrumb: "CMS / Visa / Destinations",
  },
  {
    path: "/cms/creative-toolkit",
    sectionKey: "creative-toolkit",
    title: "Creative Toolkit",
    subtitle: "Templates, brand assets, and reusable campaign blocks.",
    breadcrumb: "CMS / Experience / Creative Toolkit",
  },
];

export type { CmsRouteDefinition };
export { cmsRouteDefinitions };
