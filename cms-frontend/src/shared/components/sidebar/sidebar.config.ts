import { SidebarItem, SidebarSection } from "./sidebar.models";

class SidebarConfig {
  public static readonly sections: SidebarSection[] = [
    new SidebarSection("Content", [
      new SidebarItem(
        "Landing Places",
        "/cms/landing-places",
        "Hero carousel entries",
      ),
      new SidebarItem(
        "Destinations",
        "/cms/destinations",
        "Destinations, media, seasons",
      ),
    ]),
    new SidebarSection("Packages", [
      new SidebarItem(
        "Published Packages",
        "/cms/packages/published",
        "CRM published packages",
      ),
      new SidebarItem("Main Packages", "/cms/packages/main", "CMS curated"),
      new SidebarItem("Sub Packages", "/cms/packages/sub", "Nested packages"),
    ]),
    new SidebarSection("Visa", [
      new SidebarItem(
        "Visa Destinations",
        "/cms/visa-destinations",
        "Countries & regions",
      ),
      new SidebarItem(
        "Visa Details",
        "/cms/visa-details",
        "Overview, notes, facts",
      ),
    ]),
  ];
}

export { SidebarConfig };
