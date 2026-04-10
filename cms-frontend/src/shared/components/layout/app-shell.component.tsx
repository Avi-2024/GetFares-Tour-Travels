import { Component, type ReactNode } from "react";
import SidebarComponent from "../sidebar/sidebar.component";
import TopbarComponent from "./topbar.component";

interface AppShellProps {
  title: string;
  subtitle: string;
  breadcrumb: string;
  children: ReactNode;
}

class AppShellComponent extends Component<AppShellProps> {
  render() {
    const { title, subtitle, breadcrumb, children } = this.props;

    return (
      <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
        <SidebarComponent />
        <div className="min-w-0 flex-1">
          <TopbarComponent
            title={title}
            subtitle={subtitle}
            breadcrumb={breadcrumb}
          />
          <main className="p-6 md:p-8">{children}</main>
        </div>
      </div>
    );
  }
}

export default AppShellComponent;
