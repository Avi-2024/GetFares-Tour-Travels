import { Link } from "react-router-dom";

const ForgotPassword = () => {
  return (
    <main className="w-full min-h-screen flex flex-col md:flex-row bg-white overflow-hidden shadow-2xl">
      {/* LEFT VISUAL SECTION */}
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 relative bg-blue-600 items-center justify-center p-8 lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800"></div>

        <div className="absolute inset-0 w-full h-full opacity-10">
          <img
            className="w-full h-full object-cover mix-blend-overlay"
            src="https://storage.googleapis.com/uxpilot-auth.appspot.com/a3d8fd90df-7ac8c411121cc0e01a44.png"
            alt="background"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-8 border border-white/20 shadow-2xl animate-pulse">
            <i className="fa-solid fa-shield-halved text-6xl text-white"></i>
          </div>

          <div className="bg-white/95 p-6 rounded-2xl shadow-2xl border max-w-sm transform rotate-3 hover:rotate-0 transition-transform">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <i className="fa-solid fa-check"></i>
              </div>

              <div>
                <h4 className="font-bold text-gray-800">Secure Recovery</h4>
                <p className="text-xs text-gray-500">End-to-end encrypted</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2 bg-gray-100 rounded-full w-full">
                <div className="h-full bg-blue-500 w-2/3 animate-pulse"></div>
              </div>

              <p className="text-xs text-gray-400">Verifying identity...</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-3xl font-bold mb-2">
            Don't worry, we've got you.
          </h2>

          <p className="text-blue-100">
            Recover access to your travel agency dashboard in just a few simple
            steps.
          </p>
        </div>
      </section>

      {/* RIGHT FORM SECTION */}
      <section className="w-full md:w-1/2 lg:w-2/5 min-h-screen bg-white flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-10 relative">
        {/* Back Button */}
        <div className="absolute top-6 left-6 md:hidden">
          <Link
            to="/"
            className="flex items-center text-gray-500 hover:text-gray-900"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-2">
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </div>
          </Link>
        </div>

        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl shadow-lg">
              <i className="fa-solid fa-plane-departure"></i>
            </div>

            <span className="text-2xl font-bold text-gray-900">TravelCRM</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600">
              <i className="fa-solid fa-key text-xl"></i>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password
            </h1>

            <p className="text-gray-500">
              Enter your email and we'll send a reset link.
            </p>
          </div>

          {/* FORM */}
          <form className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email Address
              </label>

              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="fa-regular fa-envelope text-gray-400"></i>
                </div>

                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-xs text-gray-500 mt-2">
                We'll send a verification code to this email.
              </p>
            </div>

            {/* BUTTON */}
            <button className="w-full py-3.5 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700">
              Send reset link / OTP
            </button>
          </form>

          {/* BACK TO LOGIN */}
          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i>
              Back to login
            </Link>
          </div>

          {/* FOOTER */}
          <div className="mt-12 pt-6 border-t border-gray-100 flex justify-center space-x-6 text-xs text-gray-400">
            <a href="#">Contact Support</a>

            <span className="text-gray-300">•</span>

            <a href="#">Help Center</a>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;
