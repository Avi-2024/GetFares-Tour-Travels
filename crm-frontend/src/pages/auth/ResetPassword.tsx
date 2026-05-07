import { useState } from "react";
import { Link } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
  };

  const passwordStrength = strength();

  const passwordsMatch = confirm.length > 0 && password === confirm;

  return (
    <main className="w-full min-h-screen flex items-center justify-center p-4 md:p-8 bg-gray-100">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* LEFT VISUAL */}
        <section className="hidden md:flex md:w-1/2 bg-blue-600 items-center justify-center p-10 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800"></div>

          <div className="relative z-10 text-center max-w-sm">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/20">
              <i className="fa-solid fa-shield-check text-4xl text-white"></i>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">
              Secure Your Data
            </h2>

            <p className="text-blue-100 text-sm mb-8">
              TravelCRM uses industry-standard encryption to keep your agency's
              information safe.
            </p>

            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-xs text-white">
                  Security Scan: Active
                </span>
              </div>

              <div className="h-1.5 w-full bg-white/20 rounded-full">
                <div className="h-full bg-green-400 w-full"></div>
              </div>
            </div>
          </div>
        </section>

        {/* FORM SECTION */}
        <section className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <i className="fa-solid fa-plane-departure"></i>
              </div>

              <span className="text-xl font-bold text-gray-900">TravelCRM</span>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Set new password
              </h1>

              <p className="text-sm text-gray-500">
                Ensure your account is protected with a strong password.
              </p>
            </div>

            {/* FORM */}
            <form className="space-y-6">
              {/* PASSWORD */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  New Password
                </label>

                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <i className="fa-regular fa-lock text-gray-400"></i>
                  </div>

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Min 8 characters"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                  >
                    <i
                      className={`fa-regular ${
                        showPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>

                {/* PASSWORD REQUIREMENTS */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div
                    className={
                      password.length >= 8 ? "text-green-500" : "text-gray-400"
                    }
                  >
                    ✓ 8+ characters
                  </div>

                  <div
                    className={
                      /[A-Z]/.test(password)
                        ? "text-green-500"
                        : "text-gray-400"
                    }
                  >
                    ✓ Uppercase
                  </div>

                  <div
                    className={
                      /[0-9]/.test(password)
                        ? "text-green-500"
                        : "text-gray-400"
                    }
                  >
                    ✓ Number
                  </div>

                  <div
                    className={
                      /[^a-zA-Z0-9]/.test(password)
                        ? "text-green-500"
                        : "text-gray-400"
                    }
                  >
                    ✓ Special character
                  </div>
                </div>

                {/* STRENGTH BARS */}
                <div className="flex gap-1 mt-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded ${
                        passwordStrength >= i
                          ? passwordStrength <= 1
                            ? "bg-red-500"
                            : passwordStrength === 2
                              ? "bg-orange-500"
                              : passwordStrength === 3
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>

                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <i className="fa-regular fa-lock text-gray-400"></i>
                  </div>

                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-lg bg-gray-50 border outline-none ${
                      confirm.length > 0
                        ? passwordsMatch
                          ? "border-green-300"
                          : "border-red-300"
                        : "border-gray-200"
                    }`}
                    placeholder="Repeat password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                  >
                    <i
                      className={`fa-regular ${
                        showConfirm ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>

                {!passwordsMatch && confirm.length > 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* BUTTON */}
              <button className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
                Reset Password
              </button>
            </form>

            {/* BACK */}
            <div className="mt-8 text-center">
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                ← Back to login
              </Link>
            </div>

            {/* FOOTER */}
            <div className="mt-10 pt-6 border-t text-xs text-gray-400 flex justify-center gap-4">
              <a href="#">Contact Support</a>
              <span>•</span>
              <a href="#">Help Center</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ResetPassword;
