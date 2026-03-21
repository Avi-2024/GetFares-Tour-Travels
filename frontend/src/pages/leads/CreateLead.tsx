import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { getApiErrorMessage } from "../../api/apiClient";
import { useLeadsService } from "../../hooks/useLeadsService";
import { useCampaignsService } from "../../hooks/useCampaignsService";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  destinationName: string;
  travelDate: string;
  adultsCount: number;
  childrenCount: number;
  budget: string;
  visaRequired: "YES" | "NO" | "";
  preferredHotelCategory: "3_STAR" | "4_STAR" | "5_STAR" | "ANY" | "";
  travelPurpose: string;
  leadSource: string;
  campaignId: string;
  notes: string;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  destinationName: "",
  travelDate: "",
  adultsCount: 2,
  childrenCount: 0,
  budget: "",
  visaRequired: "",
  preferredHotelCategory: "",
  travelPurpose: "",
  leadSource: "Website",
  campaignId: "",
  notes: "",
};

const CreateLead: React.FC = () => {
  const navigate = useNavigate();
  const leadsService = useLeadsService();
  const campaignsService = useCampaignsService();
  const [form, setForm] = useState<FormState>(initialForm);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [campaignsRes, destinationsRes] = await Promise.allSettled([
        campaignsService.list({ status: "ACTIVE" }),
        leadsService.getDestinations(),
      ]);

      if (campaignsRes.status === "fulfilled") {
        setCampaigns((campaignsRes.value as any).data || []);
      } else {
        setCampaigns([]);
      }

      if (destinationsRes.status === "fulfilled") {
        const list = destinationsRes.value;
        setDestinations(Array.isArray(list) ? list : []);
      } else {
        setDestinations([]);
      }
    };
    void loadData();
  }, [campaignsService, leadsService]);

  useEffect(() => {
    const checkDuplicates = async () => {
      if (!form.email && !form.phone) {
        setDuplicateWarning("");
        return;
      }
      try {
        const result = await leadsService.checkDuplicate(
          form.email || undefined,
          form.phone || undefined,
        );
        setDuplicateWarning(
          (result as any).data.isDuplicate
            ? ((result as any).data.message ?? "Similar lead already exists")
            : "",
        );
      } catch {
        setDuplicateWarning("");
      }
    };

    const timer = setTimeout(() => {
      void checkDuplicates();
    }, 500);
    return () => clearTimeout(timer);
  }, [form.email, form.phone, leadsService]);

  const validation = useMemo(() => {
    return {
      firstName: !form.firstName.trim(),
      lastName: !form.lastName.trim(),
      email: !form.email.trim(),
      phone: !form.phone.trim(),
      destinationName: !form.destinationName.trim(),
      travelDate: !form.travelDate,
      adultsChildren:
        form.adultsCount < 0 || form.childrenCount < 0 || form.adultsCount < 1,
      budget: !form.budget.trim() || Number(form.budget) <= 0,
      visaRequired: form.visaRequired === "",
      preferredHotelCategory: form.preferredHotelCategory === "",
      travelPurpose: !form.travelPurpose.trim(),
    };
  }, [form]);

  const hasError = useMemo(
    () => Object.values(validation).some(Boolean),
    [validation],
  );

  const handleSubmit = async () => {
    setShowErrors(true);
    if (hasError) return;

    setLoading(true);
    setApiError("");
    const fullName = [form.firstName, form.lastName]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ");

    try {
      await leadsService.createLead({
        fullName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        addressLine: form.location.trim() || undefined,
        destinationName: form.destinationName.trim(),
        travelDate: form.travelDate,
        adultsCount: form.adultsCount,
        childrenCount: form.childrenCount,
        budget: Number(form.budget),
        visaRequired: form.visaRequired === "YES",
        preferredHotelCategory: form.preferredHotelCategory,
        travelPurpose: form.travelPurpose.trim(),
        source: form.leadSource.trim() || "Website",
        campaignId: form.campaignId || undefined,
        notes: form.notes.trim() || undefined,
        leadType: "HOLIDAY",
        status: "OPEN",
        qualificationCompleted: true,
      });
      navigate("/leads");
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Could not create lead."));
      setLoading(false);
    }
  };

  const fieldError = (key: keyof typeof validation) => showErrors && validation[key];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/leads")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Back to leads"
        >
          <FaArrowLeft className="text-sm" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create New Lead
          </h1>
          <p className="text-sm text-gray-500">
            Mandatory SOP qualification capture (7 required fields).
          </p>
        </div>
      </div>

      {duplicateWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {duplicateWarning}
        </div>
      ) : null}

      {apiError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {apiError}
        </div>
      ) : null}

      <SurfaceCard>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Customer & Qualification Details
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="First Name"
            value={form.firstName}
            onChange={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
            error={fieldError("firstName")}
          />
          <Field
            label="Last Name"
            value={form.lastName}
            onChange={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
            error={fieldError("lastName")}
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            error={fieldError("email")}
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
            error={fieldError("phone")}
          />
          <Field
            label="Address / Location"
            value={form.location}
            onChange={(value) => setForm((prev) => ({ ...prev, location: value }))}
          />
          <div>
            <label className="field-label">Destination *</label>
            <select
              className={`field-input ${fieldError("destinationName") ? "border-red-500" : ""}`}
              value={form.destinationName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, destinationName: event.target.value }))
              }
            >
              <option value="">Select destination</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.name}>
                  {destination.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Travel Date *</label>
            <input
              type="date"
              className={`field-input ${fieldError("travelDate") ? "border-red-500" : ""}`}
              value={form.travelDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, travelDate: event.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Adults *</label>
              <input
                type="number"
                min={1}
                className={`field-input ${fieldError("adultsChildren") ? "border-red-500" : ""}`}
                value={form.adultsCount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    adultsCount: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
            <div>
              <label className="field-label">Children *</label>
              <input
                type="number"
                min={0}
                className={`field-input ${fieldError("adultsChildren") ? "border-red-500" : ""}`}
                value={form.childrenCount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    childrenCount: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
          </div>
          <div>
            <label className="field-label">Budget *</label>
            <input
              type="number"
              min={1}
              className={`field-input ${fieldError("budget") ? "border-red-500" : ""}`}
              value={form.budget}
              onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Visa Required *</label>
            <select
              className={`field-input ${fieldError("visaRequired") ? "border-red-500" : ""}`}
              value={form.visaRequired}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  visaRequired: event.target.value as "YES" | "NO" | "",
                }))
              }
            >
              <option value="">Select visa requirement</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </div>
          <div>
            <label className="field-label">Preferred Hotel Category *</label>
            <select
              className={`field-input ${fieldError("preferredHotelCategory") ? "border-red-500" : ""}`}
              value={form.preferredHotelCategory}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  preferredHotelCategory: event.target.value as
                    | "3_STAR"
                    | "4_STAR"
                    | "5_STAR"
                    | "ANY"
                    | "",
                }))
              }
            >
              <option value="">Select hotel category</option>
              <option value="3_STAR">3 Star</option>
              <option value="4_STAR">4 Star</option>
              <option value="5_STAR">5 Star</option>
              <option value="ANY">Any</option>
            </select>
          </div>
          <div>
            <label className="field-label">Purpose of Travel *</label>
            <select
              className={`field-input ${fieldError("travelPurpose") ? "border-red-500" : ""}`}
              value={form.travelPurpose}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, travelPurpose: event.target.value }))
              }
            >
              <option value="">Select purpose</option>
              <option value="LEISURE">Leisure</option>
              <option value="BUSINESS">Business</option>
              <option value="HONEYMOON">Honeymoon</option>
              <option value="FAMILY">Family</option>
              <option value="ADVENTURE">Adventure</option>
            </select>
          </div>
          <div>
            <label className="field-label">Lead Source</label>
            <select
              className="field-input"
              value={form.leadSource}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, leadSource: event.target.value }))
              }
            >
              <option>Website</option>
              <option>Phone</option>
              <option>Referral</option>
              <option>Social</option>
              <option>WalkIn</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Campaign</label>
            <select
              className="field-input"
              value={form.campaignId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, campaignId: event.target.value }))
              }
            >
              <option value="">Select campaign (optional)</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Notes</label>
            <textarea
              rows={4}
              className="field-input"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
        </div>
      </SurfaceCard>

      <div className="flex justify-end">
        <button
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Lead"}
          <FaCheckCircle />
        </button>
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}) => (
  <div>
    <label className="field-label">
      {label}
      {label.includes("*") ? "" : null}
    </label>
    <input
      className={`field-input ${error ? "border-red-500" : ""}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

export default CreateLead;
