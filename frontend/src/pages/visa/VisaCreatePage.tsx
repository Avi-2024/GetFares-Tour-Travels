import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaFileLines } from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { bookingsApi } from "../../api/bookings";
import { suppliersApi } from "../../api/suppliers";
import { visaApi } from "../../api/visa";
import { getApiErrorMessage } from "../../api/apiClient";
import { validateVisaTransition } from "../../utils/workflowValidation";
import {
  getCountryVisaChecklist,
  VISA_WORKFLOW_STAGES,
  type VisaWorkflowStage,
} from "./visaWorkflow";

type Option = {
  id: string;
  label: string;
};

const VisaCreatePage = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [error, setError] = useState("");
  const [bookingOptions, setBookingOptions] = useState<Option[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<Option[]>([]);
  const [form, setForm] = useState({
    bookingId: "",
    supplierId: "",
    country: "",
    visaType: "",
    workflowStage: "DOCUMENT_COLLECTION" as VisaWorkflowStage,
    fees: "",
    appointmentDate: "",
    submissionDate: "",
    visaNumber: "",
    visaValidUntil: "",
    rejectionReason: "",
  });

  useEffect(() => {
    const loadLookups = async () => {
      setLoadingLookups(true);
      setError("");
      try {
        const [bookingsRes, suppliersRes] = await Promise.all([
          bookingsApi.list({ page: 1, limit: 300 }),
          suppliersApi.list({ page: 1, limit: 300 }),
        ]);

        const bookingsPayload = (bookingsRes as any)?.data ?? bookingsRes;
        const bookingsData =
          (bookingsPayload as any)?.data ||
          (bookingsPayload as any)?.items ||
          bookingsPayload ||
          [];
        const suppliersPayload = (suppliersRes as any)?.data ?? suppliersRes;
        const suppliersData =
          (suppliersPayload as any)?.data ||
          (suppliersPayload as any)?.items ||
          suppliersPayload ||
          [];

        setBookingOptions(
          (Array.isArray(bookingsData) ? bookingsData : []).map((booking: any) => {
            const bookingNumber =
              booking?.bookingNumber ||
              booking?.booking_number ||
              booking?.code ||
              booking?.id;
            const customer =
              booking?.customerName ||
              booking?.customer_name ||
              booking?.leadName ||
              booking?.lead_name ||
              "Unknown customer";
            return {
              id: String(booking?.id || ""),
              label: `${bookingNumber} - ${customer}`,
            };
          }),
        );

        setSupplierOptions(
          (Array.isArray(suppliersData) ? suppliersData : [])
            .filter((supplier: any) => supplier?.id)
            .map((supplier: any) => ({
              id: String(supplier.id),
              label: String(supplier.name || supplier.id),
            })),
        );
      } catch (err) {
        console.error("Failed to load visa lookup data:", err);
        setError(getApiErrorMessage(err, "Failed to load bookings/suppliers."));
      } finally {
        setLoadingLookups(false);
      }
    };

    void loadLookups();
  }, []);

  const checklist = useMemo(
    () => getCountryVisaChecklist(form.country),
    [form.country],
  );

  const stageValidationError = useMemo(
    () =>
      validateVisaTransition(
        form.workflowStage,
        form.rejectionReason,
        form.visaValidUntil,
        form.appointmentDate,
      ),
    [form.appointmentDate, form.rejectionReason, form.visaValidUntil, form.workflowStage],
  );

  const handleSave = async () => {
    if (!form.bookingId) {
      setError("Booking is required so the visa case stays linked to CRM operations.");
      return;
    }
    if (!form.country.trim() || !form.visaType.trim()) {
      setError("Country and visa type are required.");
      return;
    }
    if (stageValidationError) {
      setError(stageValidationError);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await visaApi.create({
        bookingId: form.bookingId,
        supplierId: form.supplierId || undefined,
        country: form.country.trim(),
        visaType: form.visaType.trim(),
        workflowStage: form.workflowStage,
        fees: form.fees ? Number(form.fees) : undefined,
        appointmentDate: form.appointmentDate || undefined,
        submissionDate: form.submissionDate || undefined,
        visaNumber: form.visaNumber.trim() || undefined,
        visaValidUntil: form.visaValidUntil || undefined,
        rejectionReason: form.rejectionReason.trim() || undefined,
      });
      const created =
        (response as any)?.data?.data ??
        (response as any)?.data ??
        response;
      navigate(`/visa/${created?.id}`);
    } catch (err) {
      console.error("Failed to create visa case:", err);
      setError(getApiErrorMessage(err, "Failed to create visa case."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate("/visa")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Back to visa list"
          >
            <FaArrowLeft className="text-sm" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Create Visa Case
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Link booking and supplier with a proper visa workflow stage instead of typing raw IDs.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <SurfaceCard className="border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </SurfaceCard>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SurfaceCard className="border border-gray-200 p-5 dark:border-gray-800">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Case Setup
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Booking linkage is important because checklist, follow-up, and finance context stay connected.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="field-label">Booking *</label>
                <select
                  className="field-input"
                  value={form.bookingId}
                  onChange={(e) => setForm((prev) => ({ ...prev, bookingId: e.target.value }))}
                  disabled={loadingLookups}
                >
                  <option value="">Select booking</option>
                  {bookingOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="field-label">Supplier</label>
                <select
                  className="field-input"
                  value={form.supplierId}
                  onChange={(e) => setForm((prev) => ({ ...prev, supplierId: e.target.value }))}
                  disabled={loadingLookups}
                >
                  <option value="">Select supplier</option>
                  {supplierOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Country *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="UAE / Schengen / UK / USA"
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                />
              </div>

              <div>
                <label className="field-label">Visa Type *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Tourist / Business / Visit"
                  value={form.visaType}
                  onChange={(e) => setForm((prev) => ({ ...prev, visaType: e.target.value }))}
                />
              </div>

              <div>
                <label className="field-label">Workflow Stage *</label>
                <select
                  className="field-input"
                  value={form.workflowStage}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      workflowStage: e.target.value as VisaWorkflowStage,
                    }))
                  }
                >
                  {VISA_WORKFLOW_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Visa Fees</label>
                <input
                  type="number"
                  min="0"
                  className="field-input"
                  placeholder="0"
                  value={form.fees}
                  onChange={(e) => setForm((prev) => ({ ...prev, fees: e.target.value }))}
                />
              </div>

              <div>
                <label className="field-label">Appointment Date</label>
                <input
                  type="date"
                  className="field-input"
                  value={form.appointmentDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, appointmentDate: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="field-label">Submission Date</label>
                <input
                  type="date"
                  className="field-input"
                  value={form.submissionDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, submissionDate: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="field-label">Visa Number</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Enter visa number if already available"
                  value={form.visaNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, visaNumber: e.target.value }))}
                />
              </div>

              <div>
                <label className="field-label">Visa Valid Until</label>
                <input
                  type="date"
                  className="field-input"
                  value={form.visaValidUntil}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, visaValidUntil: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="field-label">Rejection Reason</label>
                <textarea
                  rows={3}
                  className="field-input"
                  placeholder="Required only if stage is rejected"
                  value={form.rejectionReason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, rejectionReason: e.target.value }))
                  }
                />
              </div>
            </div>

            {stageValidationError ? (
              <p className="mt-4 text-sm text-amber-600 dark:text-amber-300">
                Validation note: {stageValidationError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/visa")}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loadingLookups}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Visa Case"}
              </button>
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-start gap-3">
              <FaCheck className="mt-0.5 text-blue-600 dark:text-blue-300" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Workflow Guide
                </h3>
                <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                  Docs ke according visa case ko document collection se start karke submitted, biometrics, under process, approved/rejected, aur delivered tak track karna chahiye.
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="border border-gray-200 p-5 dark:border-gray-800">
            <div className="flex items-start gap-3">
              <FaFileLines className="mt-0.5 text-gray-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Suggested Checklist
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Country-based checklist as required in PRD/SOP.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {checklist.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="border border-gray-200 p-5 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Stage Requirements
            </h3>
            <div className="mt-4 space-y-3">
              {VISA_WORKFLOW_STAGES.map((stage) => (
                <div key={stage.value} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {stage.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {stage.description}
                  </p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
};

export default VisaCreatePage;
