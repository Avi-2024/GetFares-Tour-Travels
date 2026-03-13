import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api";
import { useAuth } from "../../context/AuthContext";

const DEMO_EMAIL = "admin@gmail.com";
const DEMO_PASSWORD = "admin@1234";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
 const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setAuthState, refreshPermissions } = useAuth();

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
    
    if (validateForm()) {
      setSubmitting(true);
      try {
        const response = await authApi.login({ email, password, rememberMe: true });
        setAuthState(response.token, { id: response.user.id, name: response.user.name, email });
      } catch {
        // fallback for local development when backend auth is not available
        if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          setErrors({ email: "", password: "Invalid demo credentials" });
          setSubmitting(false);
          return;
        }
        setAuthState("local-dev-token", { id: "dev-1", name: "Alex Morgan", email: DEMO_EMAIL });
      }
      await refreshPermissions();
      setSubmitting(false);
      navigate('/dashboard');
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

              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                <i className="fa-solid fa-arrow-trend-up"></i>
              </div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div className="bg-blue-500 h-2 rounded-full w-[75%]"></div>
            </div>

            <p className="text-sm text-gray-500">+12.5% from last month</p>
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

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    John Doe
                  </p>
                  <p className="text-xs text-gray-500">Maldives Package</p>
                </div>

                <span className="ml-auto text-xs bg-blue-100 text-blue-700 py-1 px-2 rounded-full">
                  New
                </span>
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
