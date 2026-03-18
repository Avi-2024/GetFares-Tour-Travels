import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaBolt,
  FaChartLine,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPlaneDeparture,
  FaShieldAlt,
  FaUserCheck,
} from "react-icons/fa";
import { isApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useAuthService } from "../../hooks/useAuthService";

const DEMO_EMAIL = "admin@travel-crm.com";
const DEMO_PASSWORD = "admin@123";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const navigate = useNavigate();
  const { setAuthState, refreshPermissions } = useAuth();
  const authService = useAuthService();

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleHeroMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const tiltX = (y - 0.5) * 10;
    const tiltY = (x - 0.5) * -12;
    setHeroTilt({ x: tiltX, y: tiltY });
    setCursorPos({ x: x * 100, y: y * 100 });
  };

  const handleHeroLeave = () => {
    setHeroTilt({ x: 0, y: 0 });
    setCursorPos({ x: 50, y: 50 });
  };

  const validateForm = () => {
    const newErrors = { email: "", password: "" };

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setApiError("");

    try {
      const session = await authService.login({
        email,
        password,
        rememberMe: true,
      });
      const userRole = session.user.role;
      setAuthState(session.token, session.user);
      await refreshPermissions();

      const roleRoutes: Record<string, string> = {
        admin: "/dashboard",
        manager: "/dashboard",
        sales_consultant: "/dashboard",
        visa_executive: "/visa",
        accounts: "/payments",
        marketing: "/campaigns",
        operations: "/operations",
        management: "/reports",
      };
      navigate(roleRoutes[userRole ?? ""] ?? "/dashboard");
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.message || "Unable to sign in. Please try again.");
      } else {
        setApiError("Unable to sign in right now. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(6,182,212,0.14),_transparent_45%)]" />

        <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
          {/* LEFT BRAND PANEL */}
          <section className="hidden lg:flex relative flex-col px-12 py-12 xl:px-16 xl:py-14 overflow-hidden">
            <style>{`
              @keyframes floatSoft {
                0%, 100% { transform: translateY(0px) translateX(0px); }
                50% { transform: translateY(-18px) translateX(10px); }
              }
              @keyframes floatWide {
                0%, 100% { transform: translateY(0px) translateX(0px); }
                50% { transform: translateY(22px) translateX(-14px); }
              }
              @keyframes scanPulse {
                0% { transform: translateX(-40%); opacity: 0; }
                30% { opacity: 1; }
                70% { opacity: 1; }
                100% { transform: translateX(40%); opacity: 0; }
              }
              @keyframes orbit {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
              }
              @keyframes pulseCore {
                0%, 100% { opacity: 0.35; transform: scale(0.9); }
                50% { opacity: 0.9; transform: scale(1.05); }
              }
              @keyframes twinkle {
                0%, 100% { opacity: 0.2; transform: scale(0.7); }
                50% { opacity: 1; transform: scale(1.2); }
              }
              @keyframes comet {
                0% { transform: translateX(-60%); opacity: 0; }
                20% { opacity: 1; }
                100% { transform: translateX(60%); opacity: 0; }
              }
              @keyframes particleFloat {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-14px); }
              }
            `}</style>

            <div className="absolute inset-0">
              <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" style={{ animation: "floatSoft 10s ease-in-out infinite" }} />
              <div className="absolute top-16 right-[-7rem] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" style={{ animation: "floatWide 9s ease-in-out infinite" }} />
              <div className="absolute bottom-6 left-1/3 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" style={{ animation: "floatSoft 12s ease-in-out infinite" }} />
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(37,99,235,0.12),rgba(6,182,212,0.08),rgba(99,102,241,0.1))]" />
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_transparent_55%)]" />
              <div className="absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" style={{ animation: "scanPulse 6s ease-in-out infinite" }} />
              <div className="absolute inset-x-0 bottom-28 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" style={{ animation: "scanPulse 7.5s ease-in-out infinite" }} />
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FaPlaneDeparture />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">GetFares CRM</p>
                <p className="text-lg font-semibold text-slate-900">Travel Operations Hub</p>
              </div>
            </div>

            <div className="relative z-10 mt-8 max-w-md space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900">Run travel demand in real time.</h1>
              <p className="text-sm text-slate-600">
                A high-performance CRM for holidays and visas with SLA control, revenue visibility, and automated follow-ups.
              </p>

              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 backdrop-blur border border-white/50">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                    <FaChartLine />
                  </span>
                  Revenue + visa view
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 backdrop-blur border border-white/50">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600">
                    <FaBolt />
                  </span>
                  SLA escalation
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 backdrop-blur border border-white/50">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <FaUserCheck />
                  </span>
                  Team performance
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 backdrop-blur border border-white/50">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                    <FaShieldAlt />
                  </span>
                  Audit-ready ops
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-8 flex-1">
              <div className="relative h-[520px] w-full group" onMouseMove={handleHeroMove} onMouseLeave={handleHeroLeave}>
                <div
                  className="absolute inset-0 rounded-[40px] border border-white/40 bg-white/20 backdrop-blur-2xl shadow-2xl shadow-blue-500/20 transition-transform duration-300"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: `perspective(1200px) rotateX(${heroTilt.x.toFixed(2)}deg) rotateY(${heroTilt.y.toFixed(2)}deg) scale(1.01)`,
                  }}
                >
                  <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-white/10 via-transparent to-blue-500/10" />
                  <div className="absolute inset-6 rounded-[32px] border border-white/25" />
                  <div
                    className="absolute h-48 w-48 rounded-full blur-3xl opacity-70"
                    style={{
                      left: `${cursorPos.x}%`,
                      top: `${cursorPos.y}%`,
                      transform: "translate(-50%, -50%)",
                      background:
                        "radial-gradient(circle, rgba(56,189,248,0.5) 0%, rgba(99,102,241,0.2) 45%, transparent 70%)",
                    }}
                  />

                  {[280, 220, 170, 130].map((size, index) => (
                    <div
                      key={size}
                      className="absolute left-1/2 top-1/2 rounded-full border border-white/15"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        marginLeft: `-${size / 2}px`,
                        marginTop: `-${size / 2}px`,
                        animation: `orbit ${18 + index * 6}s linear infinite ${index % 2 === 0 ? "" : "reverse"}`,
                      }}
                    >
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white/90 shadow-[0_0_16px_rgba(255,255,255,0.6)]"
                        style={{ filter: `hue-rotate(${index * 40}deg)` }}
                      />
                    </div>
                  ))}

                  <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.85)]" style={{ animation: "pulseCore 4s ease-in-out infinite" }} />
                  <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/20 blur-2xl" />

                  {[
                    { top: "18%", left: "20%", delay: "0s", size: 6 },
                    { top: "12%", left: "52%", delay: "1.2s", size: 5 },
                    { top: "24%", left: "72%", delay: "2s", size: 4 },
                    { top: "42%", left: "14%", delay: "0.8s", size: 4 },
                    { top: "62%", left: "22%", delay: "1.6s", size: 5 },
                    { top: "70%", left: "48%", delay: "2.4s", size: 6 },
                    { top: "58%", left: "70%", delay: "1.4s", size: 5 },
                    { top: "36%", left: "82%", delay: "0.6s", size: 4 },
                  ].map((particle, i) => (
                    <span
                      key={i}
                      className="absolute rounded-full bg-white/70"
                      style={{
                        top: particle.top,
                        left: particle.left,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        animation: `particleFloat 8s ease-in-out infinite ${particle.delay}, twinkle 3.5s ease-in-out infinite ${particle.delay}`,
                      }}
                    />
                  ))}

                  <div className="absolute left-0 top-[18%] h-[2px] w-1/2 bg-gradient-to-r from-transparent via-blue-500/80 to-transparent" style={{ animation: "comet 6s ease-in-out infinite" }} />
                  <div className="absolute right-0 bottom-[22%] h-[2px] w-1/2 bg-gradient-to-l from-transparent via-cyan-500/70 to-transparent" style={{ animation: "comet 7.2s ease-in-out infinite" }} />
                  <div className="absolute left-1/4 bottom-[10%] h-[1px] w-1/2 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" style={{ animation: "comet 8.5s ease-in-out infinite" }} />

                  <div className="absolute left-8 top-8 text-[11px] font-semibold text-blue-600">SLA 14:23</div>
                  <div className="absolute right-8 bottom-12 text-[11px] font-semibold text-cyan-600">Routing Active</div>
                  <div className="absolute left-12 bottom-10 text-[11px] font-semibold text-indigo-600">Auto Follow-ups</div>
                </div>
              </div>
            </div>

            <p className="relative z-10 mt-6 text-xs text-slate-400">Built for Indian travel agencies and multi-branch ops.</p>
          </section>

          {/* RIGHT LOGIN FORM */}
          <section className="flex items-center justify-center px-6 py-12 lg:px-10">
            <div className="w-full max-w-md">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-blue-500/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                    <FaPlaneDeparture />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">GetFares CRM</p>
                    <p className="text-lg font-semibold text-slate-900">Sign in to continue</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
                  <p className="text-sm text-slate-500">Use your admin or team credentials to enter the workspace.</p>
                </div>

                <form className="space-y-5" onSubmit={handleSignIn}>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Email address</label>
                    <div className="relative mt-2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <FaEnvelope />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.email ? "border-red-300" : "border-slate-200"
                        }`}
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <div className="relative mt-2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <FaLock />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.password ? "border-red-300" : "border-slate-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={togglePassword}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-slate-600">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      Remember me
                    </label>
                    <Link to="/forgot-password" className="text-blue-600 font-medium hover:text-blue-700">
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white font-semibold py-3.5 shadow-md shadow-blue-500/30 hover:bg-blue-700 transition-colors"
                  >
                    {submitting ? "Signing in..." : "Sign in"}
                    {!submitting && <FaArrowRight />}
                  </button>

                  {apiError && <p className="text-sm text-red-600 text-center">{apiError}</p>}
                </form>
              </div>

              <p className="mt-6 text-center text-xs text-slate-400">Powered by GetFares Tour & Travels CRM</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Login;
