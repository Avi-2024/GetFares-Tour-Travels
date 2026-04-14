import { useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarConfig } from "./sidebar.config";
import { ClassName } from "../../../lib/cn";

interface SidebarProps {
  isDesktop: boolean;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

const SidebarComponent = ({
  isDesktop,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: SidebarProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const touchStartXRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);

  const desktopWidth = collapsed ? 88 : 316;

  const visibleSections = useMemo(() => SidebarConfig.sections, []);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const renderSection = (section: (typeof SidebarConfig.sections)[number]) => {
    const sectionExpanded = isDesktop || expandedSections[section.title] !== false;

    return (
      <div key={section.title}>
        {!collapsed && (
          <button
            type="button"
            onClick={() => {
              if (!isDesktop) {
                toggleSection(section.title);
              }
            }}
            className={ClassName.merge(
              "mb-2 flex w-full items-center justify-between px-2 text-left text-[10px] font-semibold uppercase tracking-[0.28em] text-(--text-secondary)",
              isDesktop && "cursor-default",
            )}
          >
            <span>{section.title}</span>
            {!isDesktop && (
              <span className="text-[var(--text-secondary)]">
                <ChevronDown
                  size={14}
                  className={ClassName.merge(
                    "transition-transform",
                    sectionExpanded ? "rotate-180" : "rotate-0",
                  )}
                />
              </span>
            )}
          </button>
        )}
        {sectionExpanded && (
          <div className="space-y-1">
            {section.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <NavLink
                  key={item.key}
                  to={item.href}
                  onClick={() => {
                    if (!isDesktop) {
                      onCloseMobile();
                    }
                  }}
                  className={({ isActive }) =>
                    ClassName.merge(
                      "group relative flex min-h-12 items-center rounded-2xl border border-transparent px-3 py-2.5 transition-all duration-200",
                      isActive ?
                        "border-(--border) bg-[color-mix(in_srgb,var(--primary)_14%,var(--surface))] text-(--text-primary) shadow-(--shadow-soft)"
                      : "text-(--text-secondary) hover:border-(--border) hover:bg-(--surface) hover:text-(--text-primary)",
                      collapsed && isDesktop && "justify-center px-0",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={ClassName.merge(
                          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                          isActive ?
                            "bg-[color-mix(in_srgb,var(--primary)_24%,transparent)] text-(--primary)"
                          : "bg-(--surface) text-(--text-secondary) group-hover:text-(--primary)",
                        )}
                      >
                        <ItemIcon size={16} />
                      </span>
                      {(!collapsed || !isDesktop) && (
                        <span className="ml-3 flex min-w-0 flex-col">
                          <span className="truncate text-sm font-semibold">{item.label}</span>
                          <span className="truncate text-[11px] text-(--text-secondary)">
                            {item.description}
                          </span>
                        </span>
                      )}
                      {isActive && (!collapsed || !isDesktop) && (
                        <span className="absolute left-0 top-1/2 h-7 -translate-y-1/2 rounded-r-full border-l-2 border-(--primary)" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!isDesktop) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: mobileOpen ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          className={ClassName.merge(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity",
            mobileOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          onClick={onCloseMobile}
        />
        <motion.aside
          initial={{ x: -360 }}
          animate={{ x: mobileOpen ? 0 : -360 }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          onTouchStart={(event) => {
            touchStartXRef.current = event.touches[0]?.clientX ?? null;
            touchCurrentXRef.current = touchStartXRef.current;
          }}
          onTouchMove={(event) => {
            touchCurrentXRef.current = event.touches[0]?.clientX ?? touchCurrentXRef.current;
          }}
          onTouchEnd={() => {
            const start = touchStartXRef.current;
            const end = touchCurrentXRef.current;
            if (start !== null && end !== null && start - end > 64) {
              onCloseMobile();
            }
            touchStartXRef.current = null;
            touchCurrentXRef.current = null;
          }}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(84vw,320px)] flex-col border-r border-(--border) bg-(--surface-muted) px-3 py-4 backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center gap-3 px-2">
            <img src="/logo1.png" alt="Get2Vacations" className="h-8 w-6" />
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Get2Vacations CMS
            </span>
          </div>
          <div className="space-y-5 overflow-y-auto pb-3 pr-1 hide-scrollbar">
            {visibleSections.map(renderSection)}
          </div>
        </motion.aside>
      </>
    );
  }

  return (
    <motion.aside
      animate={{ width: desktopWidth }}
      transition={{ type: "spring", stiffness: 220, damping: 30 }}
      className="sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-(--border) bg-(--surface-muted) px-3 py-4 backdrop-blur-xl relative"
    >
      <div className="mb-4 flex items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg">
            <img src="/logo1.png" alt="Get2Vacations" className="h-8 w-6" />
          </div>
          {collapsed ? null : (
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Get2Vacations CMS
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5 overflow-y-auto pb-3 pr-1 hide-scrollbar">
        {visibleSections.map(renderSection)}
      </div>

      <button
        type="button"
        onClick={onToggleCollapsed}
        className="absolute right-0 top-1/2 z-50 inline-flex h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-(--border) bg-(--surface) text-(--text-secondary) shadow-[0_8px_22px_color-mix(in_srgb,var(--text-primary)_14%,transparent)] transition hover:text-(--text-primary)"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </motion.aside>
  );
};

export default SidebarComponent;
