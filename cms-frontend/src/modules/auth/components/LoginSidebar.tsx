import { Component } from "react";

export class LoginSidebar extends Component {
  render() {
    return (
      <aside className="relative flex w-full flex-col justify-between gap-10 border-b border-white/10 bg-ink-900/70 px-8 py-10 backdrop-blur-xl sm:px-12 lg:w-[46%] lg:border-b-0 lg:border-r">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.06),_transparent_55%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-brand-300 shadow-glow">
            ◆
          </div>
          <div>
            <p className="font-['Space_Grotesk'] text-lg font-semibold tracking-wide text-mist-50">
              Prism CMS
            </p>
            <p className="text-xs uppercase tracking-[0.28em] text-mist-200/70">
              Content Studio
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="font-['Space_Grotesk'] text-3xl font-semibold leading-tight text-mist-50 sm:text-4xl">
            Content shaped with intention, delivered with clarity.
          </h2>
          <p className="text-sm leading-relaxed text-mist-200/80">
            Build editorial momentum with guided workflows, intelligent review
            paths, and real-time insight that keeps every release on track.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Manage with clarity",
              "Publish with confidence",
              "Analyse with insight",
              "Coordinate every release",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100"
              >
                <span className="h-2 w-2 rounded-full bg-brand-400" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 text-xs text-mist-200/70">
          <span>v4.2.1</span>
          <span>© 2026 Prism CMS</span>
        </div>
      </aside>
    );
  }
}
