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
      <section className={ClassName.merge("surface-card p-5", className)}>
        {(title || subtitle || rightSlot) && (
          <header className="mb-4 flex items-start justify-between gap-3">
            <div>
              {title && <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">{title}</h3>}
              {subtitle && <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>}
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
