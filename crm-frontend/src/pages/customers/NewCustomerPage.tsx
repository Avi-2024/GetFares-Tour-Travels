import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaSave,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCreditCard,
  FaDollarSign,
} from "react-icons/fa";
import { customersApi } from "../../api/customers";
import { getApiErrorMessage } from "../../api/apiClient";

interface CustomerFormData {
  fullName: string;
  phone: string;
  email: string;
  preferences: string;
  panNumber: string;
  addressLine: string;
  clientCurrency: string;
  segment: "PLATINUM" | "GOLD" | "SILVER" | "NEW";
}

interface FormErrors {
  fullName: string;
  phone: string;
  email: string;
  panNumber: string;
  addressLine: string;
}

const NewCustomerPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<CustomerFormData>({
    fullName: "",
    phone: "",
    email: "",
    preferences: "",
    panNumber: "",
    addressLine: "",
    clientCurrency: "USD",
    segment: "NEW",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    fullName: "",
    phone: "",
    email: "",
    panNumber: "",
    addressLine: "",
  });

  const currencies = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "INR", label: "INR - Indian Rupee" },
    { value: "AED", label: "AED - UAE Dirham" },
    { value: "CAD", label: "CAD - Canadian Dollar" },
    { value: "AUD", label: "AUD - Australian Dollar" },
  ];

  const segments = [
    { value: "NEW", label: "New Customer" },
    { value: "SILVER", label: "Silver Customer" },
    { value: "GOLD", label: "Gold Customer" },
    { value: "PLATINUM", label: "Platinum Customer" },
  ];

  const validateForm = (): boolean => {
    const errors: FormErrors = {
      fullName: "",
      phone: "",
      email: "",
      panNumber: "",
      addressLine: "",
    };
    let isValid = true;

    // Full Name validation
    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required";
      isValid = false;
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
      isValid = false;
    }

    // Phone validation
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
      isValid = false;
    } else if (
      !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ""))
    ) {
      errors.phone = "Please enter a valid phone number";
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

    // PAN Number validation (basic format check)
    if (!formData.panNumber.trim()) {
      errors.panNumber = "PAN number is required";
      isValid = false;
    } else if (
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())
    ) {
      errors.panNumber = "Please enter a valid PAN number (e.g., ABCDE1234F)";
      isValid = false;
    }

    // Address validation
    if (!formData.addressLine.trim()) {
      errors.addressLine = "Address is required";
      isValid = false;
    } else if (formData.addressLine.trim().length < 10) {
      errors.addressLine = "Please enter a complete address";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await customersApi.create({
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        preferences: formData.preferences || undefined,
        panNumber: formData.panNumber,
        addressLine: formData.addressLine,
        clientCurrency: formData.clientCurrency,
        segment: formData.segment,
      });

      // Navigate back to customers list
      navigate("/customers");
    } catch (error) {
      setError(getApiErrorMessage(error, "Failed to create customer"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className=" mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/customers")}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Add New Customer
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create a new customer profile with contact and preference details
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <FaUser className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Personal Information
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    handleInputChange("fullName", e.target.value)
                  }
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 transition-colors ${
                    formErrors.fullName
                      ? "border-red-500 dark:border-red-500"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                  placeholder="Enter customer full name"
                />
                {formErrors.fullName && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.fullName}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 transition-colors ${
                      formErrors.phone
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                    placeholder="+1 555 0123"
                  />
                </div>
                {formErrors.phone && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.phone}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 transition-colors ${
                      formErrors.email
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                    placeholder="customer@example.com"
                  />
                </div>
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* PAN Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PAN Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaCreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
                  <input
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) =>
                      handleInputChange(
                        "panNumber",
                        e.target.value.toUpperCase(),
                      )
                    }
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 transition-colors ${
                      formErrors.panNumber
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                {formErrors.panNumber && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.panNumber}
                  </p>
                )}
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Currency
                </label>
                <div className="relative">
                  <FaDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
                  <select
                    value={formData.clientCurrency}
                    onChange={(e) =>
                      handleInputChange("clientCurrency", e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 text-sm" />
                  <textarea
                    value={formData.addressLine}
                    onChange={(e) =>
                      handleInputChange("addressLine", e.target.value)
                    }
                    rows={3}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 transition-colors resize-none ${
                      formErrors.addressLine
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                    placeholder="Enter complete address including city, state, and postal code"
                  />
                </div>
                {formErrors.addressLine && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.addressLine}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Preferences & Segmentation */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Preferences & Segmentation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Segment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Customer Segment
                </label>
                <select
                  value={formData.segment}
                  onChange={(e) =>
                    handleInputChange(
                      "segment",
                      e.target.value as CustomerFormData["segment"],
                    )
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                >
                  {segments.map((segment) => (
                    <option key={segment.value} value={segment.value}>
                      {segment.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Travel Preferences */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Travel Preferences
                </label>
                <textarea
                  value={formData.preferences}
                  onChange={(e) =>
                    handleInputChange("preferences", e.target.value)
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 resize-none"
                  placeholder="e.g., Beach resorts, All-inclusive packages, Adventure activities, Business travel, etc."
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/customers")}
              className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⌛</span>
                  Creating Customer...
                </>
              ) : (
                <>
                  <FaSave />
                  Create Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default NewCustomerPage;
