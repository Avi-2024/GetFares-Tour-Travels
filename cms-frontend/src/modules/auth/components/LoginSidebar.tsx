import { Component } from "react";

export class LoginSidebar extends Component {
  render() {
    return (
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#020617] px-16 py-16 text-white lg:flex xl:px-20 xl:py-20">
        <style>{`
          @keyframes orbit-rotate {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
          @keyframes core-pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; filter: blur(0px); }
            50% { transform: scale(1.08); opacity: 1; filter: blur(2px); }
          }
          @keyframes comet-move {
            0% { transform: translateX(-100%) translateY(0) rotate(-35deg); opacity: 0; }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { transform: translateX(200%) translateY(100px) rotate(-35deg); opacity: 0; }
          }
          @keyframes drift {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(40px, -40px); }
          }
          @keyframes twinkle-star {
            0%, 100% { opacity: 0.2; transform: scale(0.7); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          }
        `}</style>

        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] h-[60%] w-[60%] rounded-full bg-blue-600/20 blur-[140px] animate-[drift_15s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-15%] right-[-10%] h-[50%] w-[50%] rounded-full bg-indigo-600/25 blur-[120px] animate-[drift_18s_ease-in-out_infinite_reverse]" />
          <div className="absolute right-[10%] top-[30%] h-[35%] w-[35%] rounded-full bg-cyan-500/15 blur-[100px] animate-[drift_22s_ease-in-out_infinite]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020617_85%)]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>

        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-70">
          <div className="relative h-[800px] w-[800px] translate-x-1/4">
            <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-500 p-[1px] shadow-[0_0_100px_rgba(59,130,246,0.4)] animate-[core-pulse_4s_ease-in-out_infinite]">
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-950">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.4),_transparent_75%)]" />
                  <div className="relative z-10 flex flex-col items-center">
                    <svg
                      className="h-12 w-12 animate-[spin_12s_linear_infinite] text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18" />
                      <path d="M12 3a15 15 0 0 1 0 18" />
                      <path d="M12 3a15 15 0 0 0 0 18" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full border border-white/[0.03] shadow-[inset_0_0_60px_rgba(255,255,255,0.01)]"
                style={{
                  width: `${(i + 1) * 180 + 100}px`,
                  height: `${(i + 1) * 180 + 100}px`,
                  animation: `orbit-rotate ${25 + i * 20}s linear infinite ${
                    i % 2 === 0 ? "" : "reverse"
                  }`,
                }}
              >
                <div
                  className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-gradient-to-br from-white/80 to-blue-300 shadow-[0_0_25px_rgba(255,255,255,0.5)]"
                  style={{ filter: `hue-rotate(${i * 45}deg)` }}
                />
              </div>
            ))}

            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="absolute h-1.5 w-1.5 animate-[twinkle-star_4s_ease-in-out_infinite] rounded-full bg-white"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  opacity: Math.random() * 0.4 + 0.1,
                }}
              />
            ))}

            <div className="absolute inset-[-200px] pointer-events-none">
              <div className="absolute left-[-10%] top-[20%] h-[1px] w-[150%] animate-[comet-move_8s_linear_infinite] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
              <div className="absolute left-[-10%] top-[65%] h-[1px] w-[150%] animate-[comet-move_12s_linear_infinite_4s] bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent" />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="group flex items-center gap-4">
            <div className="rounded-2xl transition-all duration-500 group-hover:scale-110">
              <img
                src="/logo1.png"
                alt="Get2Vacation CMS"
                className="h-8 w-6 transition-transform duration-500 group-hover:rotate-12"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black uppercase tracking-tighter text-white">
                GET2VACATIONS <span className="text-blue-500">CMS</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400/70">
                Travel Intelligence
              </span>
            </div>
          </div>

          <div className="max-w-xl">
            <h1 className="mb-6 text-6xl font-black leading-[0.95] tracking-tight text-white xl:text-7xl">
              Redefine your <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-500 bg-clip-text text-transparent">
                Travel Ops.
              </span>
            </h1>
            <p className="max-w-md text-xl font-medium leading-relaxed text-slate-400/90">
              A premium operating system for modern travel agencies. Fast,
              automated, and hyper-scalable.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              {[
                "SLA Monitoring",
                "Visa Automation",
                "Revenue Intelligence",
              ].map((item) => (
                <div
                  key={item}
                  className="glass-card flex cursor-default items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold text-blue-100 transition-all hover:bg-white/10"
                >
                  <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-8">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-[#020617] bg-slate-800 text-[10px] font-bold text-white ring-1 ring-white/10"
                >
                  <img
                    src={`https://i.pravatar.cc/100?u=${i}`}
                    alt="user"
                    className="h-full w-full object-cover opacity-80"
                  />
                </div>
              ))}
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#020617] bg-blue-600 text-[10px] font-bold text-white ring-1 ring-white/10">
                +2k
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white">
                Join 2,000+ travel pros
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                Industry-leading CMS since 2024
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }
}
