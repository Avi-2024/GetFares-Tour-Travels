import { Component, type ReactNode } from "react";
import AppShellComponent from "../../shared/components/layout/app-shell.component";

interface MainLayoutProps {
  title: string;
  subtitle: string;
  breadcrumb: string;
  children: ReactNode;
}

class MainLayout extends Component<MainLayoutProps> {
  render() {
    const { title, subtitle, breadcrumb, children } = this.props;

    return (
      <AppShellComponent title={title} subtitle={subtitle} breadcrumb={breadcrumb}>
        {children}
      </AppShellComponent>
    );
  }
}

export default MainLayout;
