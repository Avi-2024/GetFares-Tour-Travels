import {
  Compass,
  FolderKanban,
  Globe2,
  PackageSearch,
  Sparkles,
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
        "main-packages",
        "Parent Package",
        "/cms/packages/main",
        "Primary package records",
        FolderKanban,
      ),
      new SidebarItem(
        "sub-packages",
        "Package",
        "/cms/packages/sub",
        "Package records",
        PackageSearch,
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
    ]),
    new SidebarSection("Experience", [
      new SidebarItem(
        "creative-kit",
        "Creative Toolkit",
        "/cms/creative-toolkit",
        "Brand assets and templates",
        WandSparkles,
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
