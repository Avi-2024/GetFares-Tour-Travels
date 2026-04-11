import { Component } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarConfig } from "./sidebar.config";
import { ClassName } from "../../../lib/cn";

interface SidebarState {
  collapsed: boolean;
}

class SidebarComponent extends Component<object, SidebarState> {
  state: SidebarState = {
    collapsed: false,
  };

  private toggleCollapsed = (): void => {
    this.setState((prevState) => ({ collapsed: !prevState.collapsed }));
  };

  render() {
    const { collapsed } = this.state;

    return (
      <motion.aside
        animate={{ width: collapsed ? 88 : 316 }}
        transition={{ type: "spring", stiffness: 220, damping: 30 }}
        className="sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r  border-[var(--border)] bg-[var(--surface-muted)] px-3 py-4  backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center  justify-between gap-2 px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            {collapsed ?
              <img
                src="/logo1.png"
                alt="Get2Vacation logo"
                className="h-10 w-10 shrink-0 rounded-xl object-contain"
              />
            : <img
                src="/logo.jpeg"
                alt="Get2Vacation"
                className="h-11 w-auto max-w-[190px] shrink-0 object-contain"
              />
            }
          </div>
          <button
            type="button"
            onClick={this.toggleCollapsed}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto hide-scrollbar pb-3 pr-1">
          {SidebarConfig.sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-secondary)]">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const ItemIcon = item.icon;

                  return (
                    <NavLink
                      key={item.key}
                      to={item.href}
                      className={({ isActive }) =>
                        ClassName.merge(
                          "group relative flex min-h-12 items-center rounded-2xl border border-transparent px-3 py-2.5 transition-all duration-200",
                          isActive
                            ? "border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_14%,var(--surface))] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
                            : "text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]",
                          collapsed && "justify-center px-0",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={ClassName.merge(
                              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                              isActive
                                ? "bg-[color-mix(in_srgb,var(--primary)_24%,transparent)] text-[var(--primary)]"
                                : "bg-[var(--surface)] text-[var(--text-secondary)] group-hover:text-[var(--primary)]",
                            )}
                          >
                            <ItemIcon size={16} />
                          </span>
                          {!collapsed && (
                            <span className="ml-3 flex min-w-0 flex-col">
                              <span className="truncate text-sm font-semibold">{item.label}</span>
                              <span className="truncate text-[11px] text-[var(--text-secondary)]">
                                {item.description}
                              </span>
                            </span>
                          )}
                          {isActive && !collapsed && (
                            <span className="absolute left-0 top-1/2 h-7 -translate-y-1/2 rounded-r-full border-l-2 border-[var(--primary)]" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </motion.aside>
    );
  }
}

export default SidebarComponent;
