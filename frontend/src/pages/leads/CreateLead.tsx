import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaPlus,
  FaTag,
  FaUser,
  FaXmark,
} from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { getApiErrorMessage } from "../../api/apiClient";
import { DESTINATIONS } from "../../data/staticLists";
import { useLeadsService } from "../../hooks/useLeadsService";
import { useCampaignsService } from "../../hooks/useCampaignsService";

const steps = [
  "Customer Info",
  "Trip Details",
  "Budget",
  "Requirements",
] as const;

const CreateLead: React.FC = () => {
  const navigate = useNavigate();
  const leadsService = useLeadsService();
  const campaignsService = useCampaignsService();
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [destinationInput, setDestinationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    destinations: [] as string[],
    startDate: "",
    duration: "",
    adults: 2,
    children: 0,
    tripType: "Leisure",
    budgetRange: "",
    budgetFlexible: false,
    leadSource: "Website",
    consultant: "Alex Morgan",
    campaignId: "",
    requirements: {
      fiveStar: false,
      allInclusive: true,
      flightIncluded: false,
      airportTransfer: false,
    },
    internalNotes: "",
  });

  // Load campaigns and destinations on mount
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
        setDestinations(
          Array.isArray(list) && list.length ? list : DESTINATIONS,
        );
      } else {
        setDestinations(DESTINATIONS);
      }
    };
    loadData();
  }, [campaignsService, leadsService]);

  // Check for duplicates when email or phone changes
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

        if ((result as any).data.isDuplicate) {
          setDuplicateWarning(
            (result as any).data.message || "Similar lead already exists",
          );
        } else {
          setDuplicateWarning("");
        }
      } catch (error) {
        console.error("Duplicate check failed:", error);
      }
    };

    const timeoutId = setTimeout(checkDuplicates, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [form.email, form.phone, leadsService]);

  const errors = useMemo(() => {
    if (step === 0)
      return {
        firstName: !form.firstName,
        lastName: !form.lastName,
        email: !form.email,
        phone: !form.phone,
      };
    if (step === 1)
      return {
        destinations: form.destinations.length === 0,
        duration: !form.duration,
      };
    if (step === 2) return { budgetRange: !form.budgetRange };
    return { notes: !form.internalNotes };
  }, [step, form]);
  const hasError = Object.values(errors).some(Boolean);

  const completion = useMemo(() => {
    const checks = [
      form.firstName,
      form.lastName,
      form.email,
      form.phone,
      form.destinations.length > 0,
      form.duration,
      form.budgetRange,
      form.internalNotes,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  const toOptionalString = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  };

  const parseBudgetRange = (value: string): number | undefined => {
    if (!value) return undefined;
    if (value.includes("under")) {
      const numeric = Number(value.replace(/[^\d]/g, ""));
      return Number.isFinite(numeric) ? numeric : 1000;
    }
    if (value.includes("+")) {
      const numeric = Number(value.replace(/[^\d]/g, ""));
      return Number.isFinite(numeric) ? numeric : undefined;
    }
    if (value.includes("-")) {
      const [minStr, maxStr] = value.split("-");
      const min = Number(minStr);
      const max = Number(maxStr);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return Math.round((min + max) / 2);
      }
    }
    const numeric = Number(value.replace(/[^\d]/g, ""));
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const buildNotes = () => {
    const parts: string[] = [];

    if (form.destinations.length) {
      parts.push(`Destinations: ${form.destinations.join(", ")}`);
    }

    if (form.duration) {
      parts.push(`Duration: ${form.duration} days`);
    }

    if (form.startDate) {
      parts.push(`Start date: ${form.startDate}`);
    }

    const requirementLabels = Object.entries(form.requirements)
      .filter(([, enabled]) => enabled)
      .map(([key]) => {
        switch (key) {
          case "fiveStar":
            return "Five Star";
          case "allInclusive":
            return "All Inclusive";
          case "flightIncluded":
            return "Flight Included";
          case "airportTransfer":
            return "Airport Transfer";
          default:
            return key;
        }
      });

    if (requirementLabels.length) {
      parts.push(`Requirements: ${requirementLabels.join(", ")}`);
    }

    if (form.budgetFlexible) {
      parts.push("Budget flexible");
    }

    if (form.internalNotes.trim()) {
      parts.push(`Internal notes: ${form.internalNotes.trim()}`);
    }

    return parts.join(" | ");
  };

  const addDestination = () => {
    const val = destinationInput.trim();
    if (
      !val ||
      form.destinations.some((d) => d.toLowerCase() === val.toLowerCase())
    )
      return setDestinationInput("");
    setForm((p) => ({ ...p, destinations: [...p.destinations, val] }));
    setDestinationInput("");
  };

  const next = () => {
    setShowErrors(true);
    if (!hasError) {
      setShowErrors(false);
      setStep((s) => Math.min(steps.length - 1, s + 1));
    }
  };
  const submit = async () => {
    setShowErrors(true);
    if (!hasError) {
      setLoading(true);
      setApiError("");
      try {
        const fullName = [form.firstName, form.lastName]
          .map((value) => value.trim())
          .filter(Boolean)
          .join(" ");
        const notes = buildNotes();
        const budget = parseBudgetRange(form.budgetRange);

        const payload = {
          fullName,
          email: toOptionalString(form.email),
          phone: toOptionalString(form.phone),
          addressLine: toOptionalString(form.location),
          travelDate: toOptionalString(form.startDate),
          adultsCount: form.adults,
          childrenCount: form.children,
          budget,
          leadType: "HOLIDAY",
          travelPurpose: toOptionalString(form.tripType),
          source: toOptionalString(form.leadSource),
          campaignId: toOptionalString(form.campaignId),
          notes: notes || undefined,
          status: "OPEN",
        };

        await leadsService.createLead(payload);
        navigate("/leads");
      } catch (error) {
        console.error("Failed to create lead:", error);
        setApiError(getApiErrorMessage(error, "Could not create lead."));
        setLoading(false);
      }
    }
  };

  return (
    <div className="mx-auto max-w-9xl space-y-6 px-0 sm:px-0 lg:px-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Create New Lead
        </h1>
        <p className="text-sm text-gray-500">
          Capture customer intent in a guided 4-step wizard.
        </p>
      </div>

      <SurfaceCard>
        {apiError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {apiError}
          </div>
        ) : null}
        <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((label, i) => {
            const active = step === i;
            const done = step > i;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? "bg-green-500 text-white"
                      : active
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {done ? <FaCheck /> : i + 1}
                </div>
                <p
                  className={`text-sm ${
                    active
                      ? "text-blue-600"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-2 rounded-full bg-blue-600"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <SurfaceCard>
          {step === 0 ? (
            <section className="space-y-4">
              <Title
                icon={<FaUser />}
                title="Customer Information"
                sub="Personal and contact details."
              />

              {duplicateWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                  <FaXmark className="flex-shrink-0" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="First Name"
                  value={form.firstName}
                  onChange={(v) => setForm((p) => ({ ...p, firstName: v }))}
                  err={showErrors && (errors as any).firstName}
                />
                <Field
                  label="Last Name"
                  value={form.lastName}
                  onChange={(v) => setForm((p) => ({ ...p, lastName: v }))}
                  err={showErrors && (errors as any).lastName}
                />
                <Field
                  label="Email"
                  value={form.email}
                  onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                  err={showErrors && (errors as any).email}
                />
                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                  err={showErrors && (errors as any).phone}
                />
                <div className="md:col-span-2">
                  <label className="field-label">Location / Address</label>
                  <input
                    className="field-input"
                    value={form.location}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, location: e.target.value }))
                    }
                  />
                </div>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-4">
              <Title
                icon={<FaTag />}
                title="Trip Details"
                sub="Destinations, dates and travelers."
              />
              <div>
                <label className="field-label">Destination(s)</label>
                <div
                  className={`rounded-xl border p-3 ${
                    showErrors && (errors as any).destinations
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap gap-2">
                    {form.destinations.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {d}
                        <button
                          className="ml-1"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              destinations: p.destinations.filter(
                                (x) => x !== d,
                              ),
                            }))
                          }
                        >
                          <FaXmark />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {destinations.map((destination) => (
                      <button
                        key={destination.id}
                        type="button"
                        onClick={() =>
                          setForm((p) =>
                            p.destinations.includes(destination.name)
                              ? p
                              : {
                                  ...p,
                                  destinations: [
                                    ...p.destinations,
                                    destination.name,
                                  ],
                                },
                          )
                        }
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {destination.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="field-input"
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addDestination();
                        }
                      }}
                      placeholder="Type destination and press Enter"
                    />
                    <button
                      className="rounded-xl bg-blue-600 px-3 text-white"
                      onClick={addDestination}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Preferred Start Date</label>
                  <input
                    type="date"
                    className="field-input"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, startDate: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Duration</label>
                  <select
                    className={`field-input ${
                      showErrors && (errors as any).duration
                        ? "border-red-500"
                        : ""
                    }`}
                    value={form.duration}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, duration: e.target.value }))
                    }
                  >
                    <option value="">Select duration...</option>
                    <option value="1-3">1-3 Days</option>
                    <option value="4-7">4-7 Days</option>
                    <option value="8-14">8-14 Days</option>
                    <option value="15+">15+ Days</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(["adults", "children"] as const).map((k) => (
                  <div key={k}>
                    <label className="field-label">
                      {k === "adults" ? "Adults" : "Children"}
                    </label>
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
                      <button
                        className="rounded-lg border border-gray-200 px-2 py-1 dark:border-gray-700"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            [k]: Math.max(k === "adults" ? 1 : 0, p[k] - 1),
                          }))
                        }
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold">{form[k]}</span>
                      <button
                        className="rounded-lg border border-gray-200 px-2 py-1 dark:border-gray-700"
                        onClick={() =>
                          setForm((p) => ({ ...p, [k]: p[k] + 1 }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              <Title
                icon={<FaTag />}
                title="Budget & Source"
                sub="Budget clarity and acquisition channel."
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Budget Range</label>
                  <select
                    className={`field-input ${
                      showErrors && (errors as any).budgetRange
                        ? "border-red-500"
                        : ""
                    }`}
                    value={form.budgetRange}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, budgetRange: e.target.value }))
                    }
                  >
                    <option value="">Select budget range...</option>
                    <option value="under-1000">Under $1,000</option>
                    <option value="1000-3000">$1,000 - $3,000</option>
                    <option value="3000-5000">$3,000 - $5,000</option>
                    <option value="5000-10000">$5,000 - $10,000</option>
                    <option value="10000+">$10,000+</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Trip Type</label>
                  <select
                    className="field-input"
                    value={form.tripType}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, tripType: e.target.value }))
                    }
                  >
                    <option>Leisure</option>
                    <option>Business</option>
                    <option>Honeymoon</option>
                    <option>Family</option>
                    <option>Adventure</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Lead Source</label>
                  <select
                    className="field-input"
                    value={form.leadSource}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, leadSource: e.target.value }))
                    }
                  >
                    <option>Website</option>
                    <option>Phone</option>
                    <option>Referral</option>
                    <option>Social</option>
                    <option>WalkIn</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Campaign</label>
                  <select
                    className="field-input"
                    value={form.campaignId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, campaignId: e.target.value }))
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
                <div>
                  <label className="field-label">Assign To</label>
                  <input
                    className="field-input"
                    value={form.consultant}
                    readOnly
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.budgetFlexible}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, budgetFlexible: e.target.checked }))
                  }
                />{" "}
                Client is flexible with budget
              </label>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-4">
              <Title
                icon={<FaTag />}
                title="Requirements & Notes"
                sub="Capture add-ons and preferences."
              />
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "fiveStar",
                    "allInclusive",
                    "flightIncluded",
                    "airportTransfer",
                  ] as const
                ).map((k) => (
                  <button
                    key={k}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        requirements: {
                          ...p.requirements,
                          [k]: !p.requirements[k],
                        },
                      }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      form.requirements[k]
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div>
                <label className="field-label">Internal Notes</label>
                <textarea
                  rows={5}
                  className={`field-input ${
                    showErrors && (errors as any).notes ? "border-red-500" : ""
                  }`}
                  value={form.internalNotes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, internalNotes: e.target.value }))
                  }
                />
              </div>
            </section>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <button
              onClick={() => navigate("/leads")}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
              >
                <FaArrowLeft /> Back
              </button>
              {step < steps.length - 1 ? (
                <button
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Next <FaArrowRight />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={loading}
                  className="rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⌛</span> Creating...
                    </>
                  ) : (
                    "Create Lead"
                  )}
                </button>
              )}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Lead Summary
          </h3>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Current Step" value={steps[step]} />
            <Row
              label="Destinations"
              value={String(form.destinations.length)}
            />
            <Row
              label="Travelers"
              value={String(form.adults + form.children)}
            />
          </div>
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Completeness</span>
              <span>{completion}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
};

const Title = ({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
      {icon}
    </div>
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      <p className="text-sm text-gray-500">{sub}</p>
    </div>
  </div>
);
const Field = ({
  label,
  value,
  onChange,
  err,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  err?: boolean;
}) => (
  <div>
    <label className="field-label">{label}</label>
    <input
      className={`field-input ${err ? "border-red-500" : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {err ? <p className="mt-1 text-xs text-red-500">Required</p> : null}
  </div>
);
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-800 dark:text-gray-100">
      {value}
    </span>
  </div>
);

export default CreateLead;
