import { Component, type ReactNode } from "react";
import { ClassName } from "../../../lib/cn";

interface SurfaceCardProps {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}

class SurfaceCardComponent extends Component<SurfaceCardProps> {
  render() {
    const { title, subtitle, rightSlot, children, className } = this.props;

    return (
      <section className={ClassName.merge("surface-card p-3 sm:p-4 lg:p-5", className)}>
        {(title || subtitle || rightSlot) && (
          <header className="mb-3 flex flex-wrap items-start justify-between gap-2 sm:mb-4 sm:gap-3">
            <div>
              {title && <h3 className="font-display text-base font-semibold text-[var(--text-primary)] sm:text-lg">{title}</h3>}
              {subtitle && <p className="text-xs text-[var(--text-secondary)] sm:text-sm">{subtitle}</p>}
            </div>
            {rightSlot}
          </header>
        )}
        {children}
      </section>
    );
  }
}

export default SurfaceCardComponent;
