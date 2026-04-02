import { Component } from "react";
import { SidebarConfig } from "./sidebar.config";
import { ClassNameBuilder } from "../../utils/class-name.builder";

class SidebarPage extends Component {
  private getActivePath(): string {
    if (typeof window === "undefined") {
      return "";
    }
    return window.location.pathname;
  }

  private isActive(href: string, currentPath: string): boolean {
    if (!href || !currentPath) {
      return false;
    }
    return currentPath === href || currentPath.startsWith(`${href}/`);
  }

  render() {
    const activePath = this.getActivePath();

    return (
      <aside className="flex h-full w-72 flex-col border-r border-slate-200/70 bg-white/80 px-6 py-6 text-slate-900 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-semibold text-white">
            G2
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Get2Vacation
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              CMS Console
            </p>
          </div>
        </div>

        <nav className="mt-8 flex-1 space-y-8">
          {SidebarConfig.sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const isActive = this.isActive(item.href, activePath);
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={ClassNameBuilder.join(
                        "flex flex-col gap-1 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                        isActive ?
                          "border-blue-200 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200"
                        : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-200 dark:hover:border-slate-800 dark:hover:bg-slate-900/70",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span>{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {item.description}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          API: Landing, Destinations, Packages, Visa
        </div>
      </aside>
    );
  }
}

export default SidebarPage;
