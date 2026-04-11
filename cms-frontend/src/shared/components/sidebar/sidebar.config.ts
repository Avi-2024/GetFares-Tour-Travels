import {
  Compass,
  FolderKanban,
  Globe2,
  MapPinned,
  PackageSearch,
  Rows3,
  Sparkles,
  TicketCheck,
  WandSparkles,
} from "lucide-react";
import { SidebarItem, SidebarSection } from "./sidebar.models";

class SidebarConfig {
  public static readonly sections: SidebarSection[] = [
    new SidebarSection("CMS Content", [
      new SidebarItem(
        "landing-places",
        "Landing Places",
        "/cms/landing-places",
        "Hero cards & carousel blocks",
        Sparkles,
      ),
      new SidebarItem(
        "destinations",
        "Destinations",
        "/cms/destinations",
        "Regions, tags, media & SEO",
        Compass,
      ),
    ]),
    new SidebarSection("Packages", [
      new SidebarItem(
        "published-packages",
        "Packages",
        "/cms/packages/published",
        "All package inventory",
        PackageSearch,
      ),
      new SidebarItem(
        "main-packages",
        "Main Packages",
        "/cms/packages/main",
        "Primary curated offers",
        FolderKanban,
      ),
      new SidebarItem(
        "sub-packages",
        "Sub Packages",
        "/cms/packages/sub",
        "Nested itinerary units",
        Rows3,
      ),
    ]),
    new SidebarSection("Visa", [
      new SidebarItem(
        "visa-destinations",
        "Visa Destinations",
        "/cms/visa-destinations",
        "Country and region matrix",
        Globe2,
      ),
      new SidebarItem(
        "visa-details",
        "Visa Details",
        "/cms/visa-details",
        "Requirements, notes & uploads",
        TicketCheck,
      ),
    ]),
    new SidebarSection("Experience", [
      new SidebarItem(
        "creative-kit",
        "Creative Toolkit",
        "/cms/creative-toolkit",
        "Brand assets and templates",
        WandSparkles,
      ),
      new SidebarItem(
        "destination-map",
        "Destination Map",
        "/cms/destination-map",
        "Geo preview and clusters",
        MapPinned,
      ),
    ]),
    new SidebarSection("Deleted Objects", [
      new SidebarItem(
        "deleted-objects",
        "Deleted Objects",
        "/cms/deleted",
        "Hard delete archived records",
        PackageSearch,
      ),
    ]),
  ];
}

export { SidebarConfig };
