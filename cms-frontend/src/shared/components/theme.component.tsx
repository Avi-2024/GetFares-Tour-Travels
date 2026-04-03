import { Component } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeContext, type IThemeContext } from "../contexts/ThemeContext";

class ThemeToggle extends Component {
  static contextType = ThemeContext;
  declare context: IThemeContext;

  private handleToggle = (): void => {
    this.context.toggleTheme();
  };

  render() {
    const isDark = this.context.theme === "dark";

    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        whileHover={{ y: -1 }}
        onClick={this.handleToggle}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition-colors"
        aria-label="Toggle color theme"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]">
          {isDark ? <MoonStar size={14} /> : <SunMedium size={14} />}
        </span>
        <span className="text-[var(--text-secondary)]">{isDark ? "Dark" : "Light"}</span>
      </motion.button>
    );
  }
}

export default ThemeToggle;
