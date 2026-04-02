class SidebarItem {
  public readonly label: string;
  public readonly href: string;
  public readonly description?: string;

  constructor(label: string, href: string, description?: string) {
    this.label = label;
    this.href = href;
    this.description = description;
  }
}

class SidebarSection {
  public readonly title: string;
  public readonly items: SidebarItem[];

  constructor(title: string, items: SidebarItem[]) {
    this.title = title;
    this.items = items;
  }
}

export { SidebarItem, SidebarSection };
