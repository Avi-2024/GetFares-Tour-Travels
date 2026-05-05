class LoginFormTheme {
  private readonly isDark: boolean;

  constructor(theme: "light" | "dark") {
    this.isDark = theme === "dark";
  }

  public section(): string {
    return `flex items-center justify-center px-6 py-12 lg:px-10 ${
      this.isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`;
  }

  public card(): string {
    return `rounded-3xl border p-8 shadow-[0_25px_80px_rgba(59,130,246,0.15)] ${
      this.isDark ? "border-slate-800 bg-slate-900/95" : "border-slate-200/70 bg-white"
    }`;
  }

  public title(): string {
    return `text-lg font-semibold ${this.isDark ? "text-slate-100" : "text-slate-900"}`;
  }

  public heading(): string {
    return `text-2xl font-semibold ${this.isDark ? "text-slate-100" : "text-slate-900"}`;
  }

  public subText(): string {
    return `text-sm ${this.isDark ? "text-slate-400" : "text-slate-500"}`;
  }

  public label(): string {
    return `text-sm font-medium ${this.isDark ? "text-slate-300" : "text-slate-700"}`;
  }

  public input(): string {
    return `w-full rounded-xl border py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
      this.isDark ?
        "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-blue-900/60"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
    }`;
  }

  public checkbox(): string {
    return `h-4 w-4 rounded border-slate-300 text-blue-600 ${
      this.isDark ? "border-slate-600 bg-slate-900" : ""
    }`;
  }

  public link(): string {
    return `font-medium ${
      this.isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
    }`;
  }

  public error(): string {
    return `text-center text-sm ${this.isDark ? "text-red-400" : "text-red-600"}`;
  }

  public footer(): string {
    return `mt-6 text-center text-xs ${this.isDark ? "text-slate-500" : "text-slate-400"}`;
  }

  public brand(): string {
    return `text-xs font-semibold uppercase tracking-[0.2em] ${
      this.isDark ? "text-blue-400" : "text-blue-600"
    }`;
  }

  public statusBadge(): string {
    return `flex items-center justify-center text-emerald-500 ${
      this.isDark ? "text-emerald-400" : "text-emerald-500"
    }`;
  }

  public mutedText(): string {
    return `flex items-center gap-2 ${this.isDark ? "text-slate-400" : "text-slate-600"}`;
  }

  public eyeButton(): string {
    return `absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 transition-colors ${
      this.isDark ? "hover:text-slate-300" : "hover:text-slate-600"
    }`;
  }
}

export { LoginFormTheme };
