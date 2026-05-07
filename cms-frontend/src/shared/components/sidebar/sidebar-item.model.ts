import type { LucideIcon } from "lucide-react";

class SidebarItem {
  public readonly key: string;
  public readonly label: string;
  public readonly href: string;
  public readonly description: string;
  public readonly icon: LucideIcon;

  constructor(
    key: string,
    label: string,
    href: string,
    description: string,
    icon: LucideIcon,
  ) {
    this.key = key;
    this.label = label;
    this.href = href;
    this.description = description;
    this.icon = icon;
  }
}

export { SidebarItem };
