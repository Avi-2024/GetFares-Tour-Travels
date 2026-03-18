import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaBolt,
  FaChartLine,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGlobeAsia,
  FaLock,
  FaPlaneDeparture,
  FaShieldAlt,
  FaUserCheck,
} from "react-icons/fa";
import { authApi } from "../../api";
import { ApiError } from "../../api/apiClient";
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
  const navigate = useNavigate();
  const { setAuthState, refreshPermissions } = useAuth();
  const authService = useAuthService();

  const togglePassword = () => {
    setShowPassword(!showPassword);
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
    <main className="w-full h-screen flex flex-col md:flex-row bg-white overflow-hidden">

      {/* LEFT SECTION */}
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 relative bg-blue-600 items-center justify-center p-8 lg:p-12">

        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800"></div>

        <div className="relative z-10 w-full max-w-lg transform -rotate-6 scale-90 lg:scale-100">

          {/* Card 1 */}
          <div className="bg-white/95 p-6 rounded-2xl shadow-2xl mb-6 border transform translate-x-12">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Total Revenue
                </p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">
                  $124,500
                </h3>
              </div>

                {/* ORBIT RINGS */}
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 rounded-full border border-white/[0.03] shadow-[inset_0_0_60px_rgba(255,255,255,0.01)]"
                    style={{
                      width: `${(i + 1) * 180 + 100}px`,
                      height: `${(i + 1) * 180 + 100}px`,
                      animation: `orbit-rotate ${25 + i * 20}s linear infinite ${i % 2 === 0 ? "" : "reverse"}`,
                    }}
                  >
                    {/* Floating Glow Nodes */}
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-white/80 to-blue-300 shadow-[0_0_25px_rgba(255,255,255,0.5)] border border-white/40"
                      style={{ filter: `hue-rotate(${i * 45}deg)` }}
                    />
                  </div>
                ))}

                {/* FLOATING PARTICLES */}
                {[...Array(40)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-white rounded-full animate-[twinkle-star_4s_ease-in-out_infinite]"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 5}s`,
                      opacity: Math.random() * 0.4 + 0.1,
                    }}
                  />
                ))}

                {/* COMET SWEEP LINES */}
                <div className="absolute inset-[-200px] pointer-events-none">
                  <div className="absolute top-[20%] left-[-10%] w-[150%] h-[1px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-[comet-move_8s_linear_infinite]" />
                  <div className="absolute top-[65%] left-[-10%] w-[150%] h-[1px] bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent animate-[comet-move_12s_linear_infinite_4s]" />
                </div>
              </div>
            </div>

            {/* CONTENT LAYER */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              {/* TOP: BRANDING */}
              <div className="flex items-center gap-4 group cursor-default">
                <div className="p-3 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:bg-white/15">
                  <FaPlaneDeparture className="text-2xl text-blue-400 group-hover:rotate-12 transition-transform duration-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tighter text-white uppercase">
                    GetFares <span className="text-blue-500">CRM</span>
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.4em] text-blue-400/70 uppercase">
                    Travel Intelligence
                  </span>
                </div>
              </div>

          {/* Card 2 */}
          <div className="bg-white/95 p-6 rounded-2xl shadow-2xl border relative -left-8">

            <div className="flex justify-between items-center mb-6">
              <h4 className="font-bold text-gray-800">Recent Leads</h4>
              <button className="text-blue-600 text-sm font-medium">
                View All
              </button>
            </div>

            <div className="space-y-4">

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold">
                  JD
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">Join 2,000+ travel pros</p>
                  <p className="text-[10px] font-medium text-slate-500">Industry-leading CRM since 2024</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="absolute bottom-12 left-12 right-12 text-white z-20">
          <h2 className="text-3xl font-bold mb-2">
            Manage your travel agency with ease.
          </h2>

          <p className="text-blue-100">
            Streamline bookings, manage leads, and grow your business.
          </p>
        </div>

      </section>

      {/* RIGHT LOGIN FORM */}
      <section className="w-full md:w-1/2 lg:w-2/5 h-full bg-white flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-8 overflow-y-auto">

        <div className="w-full max-w-md mx-auto">

          {/* Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl">
              <i className="fa-solid fa-plane-departure"></i>
            </div>

            <span className="text-2xl font-bold text-gray-900">
              TravelCRM
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back
            </h1>

            <p className="text-gray-500">
              Please enter your details to sign in.
            </p>
          </div>

          {/* FORM */}
          <form className="space-y-6" onSubmit={handleSignIn}>

            {/* EMAIL */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email address
              </label>

              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="fa-regular fa-envelope text-gray-400"></i>
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div>

              <label className="text-sm font-medium text-gray-700">
                Password
              </label>

              <div className="relative mt-2">

                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="fa-solid fa-lock text-gray-400"></i>
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200'
                  }`}
                />

                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                >
                  <i
                    className={`fa-regular ${
                      showPassword ? "fa-eye-slash" : "fa-eye"
                    }`}
                  ></i>
                </button>

              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}

            </div>

            {/* REMEMBER */}
            <div className="flex items-center justify-between">

              <label className="flex items-center text-sm text-gray-600">
                <input type="checkbox" className="mr-2" />
                Remember me
              </label>

              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 font-medium"
              >
                Forgot password?
              </Link>

            </div>

            {/* BUTTON */}
            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
            {apiError && (
              <p className="text-sm text-red-600 text-center">{apiError}</p>
            )}

          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Powered by GetFares Tour & Travels CRM
          </p>

        </div>

      </section>

    </main>
  );
};

export default Login;
