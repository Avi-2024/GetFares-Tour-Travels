import type { SidebarItem } from "./sidebar-item.model";

class SidebarSection {
  public readonly title: string;
  public readonly items: SidebarItem[];

  constructor(title: string, items: SidebarItem[]) {
    this.title = title;
    this.items = items;
  }
}

export { SidebarSection };
