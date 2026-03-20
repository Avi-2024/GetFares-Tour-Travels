import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRotateRight,
  FaCheck,
  FaDesktop,
  FaDownload,
  FaEnvelope,
  FaFloppyDisk,
  FaMobileScreen,
  FaPlaneDeparture,
  FaPlus,
} from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { leadsApi } from "../../api/leads";
import { quotationsApi } from "../../api/quotations";
import { getApiErrorMessage } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

type Currency = "USD" | "EUR" | "INR";
type SavedQuote = {
  id: string;
  quoteNumber: string;
  customer: string;
  email: string;
  destination: string;
  details: string;
  total: number;
  margin: number;
  status: "pending" | "draft";
  lastSent: string | null;
  sentDate: string | null;
};
interface Item {
  id: string;
  day: string;
  title: string;
  description: string;
}
interface Price {
  id: string;
  name: string;
  cost: number;
  markup: number;
  price: number;
}

type LeadOption = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  destinationId?: string | null;
  travelDate?: string | null;
  adultsCount?: number | null;
  childrenCount?: number | null;
  travelPurpose?: string | null;
};
const initialItinerary: Item[] = [
  {
    id: "1",
    day: "Day 1",
    title: "Arrival & Transfer",
    description: "Private speedboat transfer from airport to resort.",
  },
  {
    id: "2",
    day: "Day 2",
    title: "Lagoon Excursion",
    description: "Guided reef and lagoon experience with lunch.",
  },
];
const pricing: Price[] = [
  { id: "1", name: "Accommodation", cost: 3200, markup: 15, price: 3680 },
  { id: "2", name: "Transfers", cost: 400, markup: 10, price: 440 },
  { id: "3", name: "Activities", cost: 120, markup: 8.3, price: 130 },
];

const QuotationBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [showPreview, setShowPreview] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [currency, setCurrency] = useState<Currency>("INR");
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [destinationMap, setDestinationMap] = useState<Record<string, string>>(
    {},
  );
  const [form, setForm] = useState({
    quote: "",
    version: "Draft",
    customer: "",
    email: "",
    destination: "",
    startDate: "",
    nights: 1,
    adults: 1,
    validUntil: "",
    inclusions: "",
    exclusions: "",
  });
  const [downloading, setDownloading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [itineraryItems, setItineraryItems] =
    useState<Item[]>(initialItinerary);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<{
    day: string;
    title: string;
    description: string;
  }>({
    day: "Day 3",
    title: "",
    description: "",
  });
  const [packageType, setPackageType] = useState("Leisure");
  const [services, setServices] = useState({
    hotel: true,
    flights: true,
    tours: true,
    visa: false,
    insurance: false,
  });
  const [costs, setCosts] = useState({
    supplierCost: 4200,
    markupPercent: 12,
    serviceFee: 120,
    taxPercent: 5,
    discount: 0,
  });
  const previewRef = useRef<HTMLDivElement | null>(null);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );

  useEffect(() => {
    const loadDestinations = async () => {
      try {
        const response = await leadsApi.getDestinations();
        const list =
          (response as { data?: Array<{ id: string; name?: string }> }).data ??
          (response as Array<{ id: string; name?: string }>) ??
          [];
        const map: Record<string, string> = {};
        list.forEach((item) => {
          if (item?.id) {
            map[item.id] = item.name || item.id;
          }
        });
        setDestinationMap(map);
      } catch (_error) {
        setDestinationMap({});
      }
    };

    void loadDestinations();
  }, []);

  useEffect(() => {
    const loadLeads = async () => {
      if (!token) {
        setLeads([]);
        setLeadsError("Login required to load leads.");
        return;
      }

      setLeadsLoading(true);
      setLeadsError("");
      try {
        const response = await leadsApi.list({ page: 1, limit: 100 });
        const payload = (response as any)?.data ?? response;
        const data =
          (payload as any)?.data || (payload as any)?.items || payload;
        if (Array.isArray(data)) {
          setLeads(data as LeadOption[]);
        } else {
          setLeads([]);
          setLeadsError("Invalid lead data from API.");
        }
      } catch (error) {
        console.error("Failed to load leads:", error);
        setLeads([]);
        setLeadsError(getApiErrorMessage(error, "Failed to load leads from API."));
      } finally {
        setLeadsLoading(false);
      }
    };

    void loadLeads();
  }, [token]);

  useEffect(() => {
    if (!selectedLead) return;

    const destinationName = selectedLead.destinationId
      ? destinationMap[selectedLead.destinationId] || form.destination
      : form.destination;

    setForm((prev) => ({
      ...prev,
      customer: selectedLead.fullName || prev.customer,
      email: selectedLead.email || prev.email,
      destination: destinationName,
      startDate: selectedLead.travelDate
        ? selectedLead.travelDate.slice(0, 10)
        : prev.startDate,
      adults: Number(selectedLead.adultsCount || prev.adults || 1),
    }));
  }, [selectedLead, destinationMap, form.destination]);

  const computed = useMemo(() => {
    const supplier = Number(costs.supplierCost) || 0;
    const markupVal = supplier * ((Number(costs.markupPercent) || 0) / 100);
    const serviceFee = Number(costs.serviceFee) || 0;
    const preTax = supplier + markupVal + serviceFee;
    const taxVal = preTax * ((Number(costs.taxPercent) || 0) / 100);
    const discount = Number(costs.discount) || 0;
    const totalPrice = Math.max(preTax + taxVal - discount, 0);
    const profit = totalPrice - supplier - taxVal;
    const margin = totalPrice ? (profit / totalPrice) * 100 : 0;
    return {
      supplier,
      markupVal,
      serviceFee,
      taxVal,
      discount,
      totalPrice,
      profit,
      margin,
    };
  }, [costs]);

  const subtotal = computed.supplier + computed.markupVal + computed.serviceFee;
  const taxes = computed.taxVal;
  const total = computed.totalPrice;

  const money = (v: number) => {
    const locale = currency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(v);
  };

  const autofillCustomer = () => {
    if (selectedLead) {
      setForm((p) => ({
        ...p,
        customer: selectedLead.fullName || p.customer,
        email: selectedLead.email || p.email,
        destination:
          (selectedLead.destinationId &&
            destinationMap[selectedLead.destinationId]) ||
          p.destination,
        startDate: selectedLead.travelDate
          ? selectedLead.travelDate.slice(0, 10)
          : p.startDate,
        adults: Number(selectedLead.adultsCount || p.adults || 1),
      }));
      setSaveError("");
      return;
    }
    setSaveError("Select a lead to auto-fill.");
  };

  const addItineraryItem = () => {
    if (
      !newItem.title.trim() ||
      !newItem.description.trim() ||
      !newItem.day.trim()
    ) {
      alert("Please fill all fields for the new item.");
      return;
    }
    setItineraryItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        day: newItem.day,
        title: newItem.title,
        description: newItem.description,
      },
    ]);
    const nextDay = `Day ${itineraryItems.length + 2}`;
    setShowAddModal(false);
    setNewItem({ day: nextDay, title: "", description: "" });
  };

  const handleDownload = async () => {
    if (!previewRef.current || downloading) return;
    setDownloading(true);
    try {
      // Lazy-load only when needed to keep bundle light and avoid install.
      // @ts-ignore - remote ESM URL has no local types
      const html2canvasModule = (await import(
        /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm"
      )) as any;
      const html2canvas = html2canvasModule.default || html2canvasModule;
      // @ts-ignore - remote ESM URL has no local types
      const jsPdfModule = (await import(
        /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm"
      )) as any;
      const JsPDF = jsPdfModule.default || jsPdfModule;

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new JsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(
        imgData,
        "PNG",
        0,
        position,
        pageWidth,
        imgHeight,
        "",
        "FAST",
      );
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          0,
          position,
          pageWidth,
          imgHeight,
          "",
          "FAST",
        );
        heightLeft -= pageHeight;
      }

      pdf.save(`${form.quote || "quotation"}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      alert("Download nahi ho paya, please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = () => {
    setSaveError("");

    if (!token) {
      const newQuote: SavedQuote = {
        id: String(Date.now()),
        quoteNumber: form.quote || "Draft",
        customer: form.customer || "Unnamed Customer",
        email: form.email || "New Lead",
        destination: form.destination || "Destination",
        details: `${form.nights} nights - ${packageType}`,
        total: computed.totalPrice,
        margin: Number(computed.margin.toFixed(1)),
        status: "pending",
        lastSent: null,
        sentDate: new Date().toISOString().slice(0, 10),
      };

      if (typeof window !== "undefined") {
        const existingRaw = localStorage.getItem("quotations_custom");
        const existing = existingRaw
          ? (JSON.parse(existingRaw) as SavedQuote[])
          : [];
        localStorage.setItem(
          "quotations_custom",
          JSON.stringify([newQuote, ...existing]),
        );
      }

      setShowSaved(true);
      setTimeout(() => navigate("/quotations"), 1200);
      return;
    }

    if (!selectedLeadId) {
      setSaveError("Please select a lead before saving.");
      return;
    }

    const supplier = Number(costs.supplierCost) || 0;
    const serviceFee = Number(costs.serviceFee) || 0;
    const components = [
      {
        itemType: "OTHER",
        description: "Package Cost",
        cost: supplier,
      },
      ...(serviceFee
        ? [
            {
              itemType: "OTHER",
              description: "Service Fee",
              cost: serviceFee,
            },
          ]
        : []),
    ];

    const taxPercent = Number(costs.taxPercent) || 0;
    const discount = Number(costs.discount) || 0;
    const markupAmount =
      Number(costs.supplierCost || 0) * (Number(costs.markupPercent || 0) / 100);

    const expiresInHours = (() => {
      if (!form.validUntil) return undefined;
      const diffMs = new Date(form.validUntil).getTime() - Date.now();
      if (!Number.isFinite(diffMs) || diffMs <= 0) return undefined;
      const hours = Math.ceil(diffMs / (1000 * 60 * 60));
      return Math.min(hours, 720);
    })();

    const payload = {
      leadId: selectedLeadId,
      components,
      marginPercent: Number(costs.markupPercent) || 0,
      discount,
      taxPercent,
      supplierCost: supplier,
      markupAmount,
      serviceFeeAmount: serviceFee,
      taxAmount: Number(computed.taxVal) || 0,
      costCurrency: currency,
      clientCurrency: currency,
      supplierCurrency: currency,
      ...(expiresInHours ? { expiresInHours } : {}),
    };

    setSaving(true);
    quotationsApi
      .create(payload)
      .then(() => {
        setShowSaved(true);
        setTimeout(() => navigate("/quotations"), 1200);
      })
      .catch((error) => {
        console.error("Failed to save quotation:", error);
        setSaveError(
          getApiErrorMessage(error, "Failed to save quotation. Please try again."),
        );
      })
      .finally(() => setSaving(false));
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/quotations")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Back to quotations"
                title="Back to Quotations"
              >
                <FaArrowLeft className="text-sm" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Quotation Builder
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              Create and preview polished quotations quickly.
            </p>
            {saveError ? (
              <p className="mt-2 text-sm text-red-600">{saveError}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {form.version}
            </span>
            <button
              onClick={handleDownload}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              disabled={downloading}
            >
              <FaDownload className="mr-2 inline" />{" "}
              {downloading ? "Preparing..." : "Download"}
            </button>
            <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <FaEnvelope className="mr-2 inline" /> Send
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <FaFloppyDisk className="mr-2 inline" /> Save Quote
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]">
          {/* Left Column - Scrollable with hidden scrollbar */}
          <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 scrollbar-hide">
            <SurfaceCard>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Customer & Trip
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={autofillCustomer}
                    className="text-sm text-blue-600"
                  >
                    Auto-fill
                  </button>
                  <button
                    onClick={() =>
                      navigate(selectedLeadId ? `/leads/${selectedLeadId}` : "/leads")
                    }
                    className="text-sm text-blue-600"
                  >
                    Edit Lead
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Lead</label>
                  <select
                    className="field-input"
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    disabled={leadsLoading}
                  >
                    <option value="">Select a lead</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.fullName ||
                          lead.email ||
                          lead.phone ||
                          lead.id}
                      </option>
                    ))}
                  </select>
                  {leadsLoading ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Loading leads...
                    </p>
                  ) : null}
                  {leadsError ? (
                    <p className="mt-1 text-xs text-red-600">{leadsError}</p>
                  ) : null}
                </div>
                <Field
                  label="Customer"
                  value={form.customer}
                  onChange={(v) => setForm((p) => ({ ...p, customer: v }))}
                />
                <Field
                  label="Email"
                  value={form.email}
                  onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                />
                <Field
                  label="Destination"
                  value={form.destination}
                  onChange={(v) => setForm((p) => ({ ...p, destination: v }))}
                />
                <div>
                  <label className="field-label">Start Date</label>
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
                  <label className="field-label">Nights</label>
                  <input
                    type="number"
                    className="field-input"
                    value={form.nights}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        nights: Number(e.target.value || 1),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Adults</label>
                  <input
                    type="number"
                    className="field-input"
                    value={form.adults}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        adults: Number(e.target.value || 1),
                      }))
                    }
                  />
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Package Builder
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Select scope & services
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Package Type</label>
                  <select
                    className="field-input"
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                  >
                    {[
                      "Leisure",
                      "Corporate",
                      "Group",
                      "Visa Only",
                      "Insurance Only",
                    ].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "hotel", label: "Hotel" },
                    { key: "flights", label: "Flights" },
                    { key: "tours", label: "Tours" },
                    { key: "visa", label: "Visa" },
                    { key: "insurance", label: "Insurance" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() =>
                        setServices((prev) => ({
                          ...prev,
                          [s.key]: !prev[s.key as keyof typeof prev],
                        }))
                      }
                      className={`px-3 py-2 text-xs rounded-lg border ${
                        services[s.key as keyof typeof services]
                          ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200"
                          : "bg-white border-gray-200 text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                {Object.entries(services)
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                    >
                      <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">
                        {key}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Included
                      </p>
                    </div>
                  ))}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Cost & Profit
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Auto calculations
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <NumberField
                  label="Supplier Cost"
                  value={costs.supplierCost}
                  onChange={(v) => setCosts((p) => ({ ...p, supplierCost: v }))}
                  prefix="$"
                />
                <NumberField
                  label="Markup %"
                  value={costs.markupPercent}
                  onChange={(v) =>
                    setCosts((p) => ({ ...p, markupPercent: v }))
                  }
                />
                <NumberField
                  label="Service Fee"
                  value={costs.serviceFee}
                  onChange={(v) => setCosts((p) => ({ ...p, serviceFee: v }))}
                  prefix="$"
                />
                <NumberField
                  label="Tax %"
                  value={costs.taxPercent}
                  onChange={(v) => setCosts((p) => ({ ...p, taxPercent: v }))}
                />
                <NumberField
                  label="Discount"
                  value={costs.discount}
                  onChange={(v) => setCosts((p) => ({ ...p, discount: v }))}
                  prefix="$"
                />
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <SummaryTile
                  label="Total Price"
                  value={money(computed.totalPrice)}
                  tone="blue"
                />
                <SummaryTile
                  label="Profit"
                  value={money(computed.profit)}
                  tone="green"
                />
                <SummaryTile
                  label="Margin"
                  value={`${computed.margin.toFixed(1)}%`}
                  tone="amber"
                />
                <SummaryTile
                  label="Tax"
                  value={money(computed.taxVal)}
                  tone="purple"
                />
              </div>
            </SurfaceCard>
            <SurfaceCard>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Itinerary Items
                </h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                >
                  <FaPlus className="mr-1 inline" /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {itineraryItems.map((i) => (
                  <div
                    key={i.id}
                    className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {i.day}
                      </span>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {i.title}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500">{i.description}</p>
                  </div>
                ))}
              </div>
            </SurfaceCard>
            <SurfaceCard>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Pricing Breakdown
                </h2>
                <select
                  className="field-input w-28 py-1.5"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  <option>INR</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700">
                      <th className="py-2 text-left">Item</th>
                      <th className="py-2 text-right">Cost</th>
                      <th className="py-2 text-right">Markup</th>
                      <th className="py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-2">{p.name}</td>
                        <td className="py-2 text-right">{money(p.cost)}</td>
                        <td className="py-2 text-right text-green-600">
                          {p.markup}%
                        </td>
                        <td className="py-2 text-right font-medium">
                          {money(p.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Taxes ({costs.taxPercent}%)</span>
                  <span>{money(taxes)}</span>
                </div>
                {costs.discount ? (
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Discount</span>
                    <span>-{money(costs.discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-blue-600">{money(total)}</span>
                </div>
              </div>
            </SurfaceCard>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SurfaceCard>
                <h3 className="mb-2 text-sm font-semibold text-green-700">
                  Inclusions
                </h3>
                <textarea
                  rows={5}
                  value={form.inclusions}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, inclusions: e.target.value }))
                  }
                  className="field-input"
                />
              </SurfaceCard>
              <SurfaceCard>
                <h3 className="mb-2 text-sm font-semibold text-red-700">
                  Exclusions
                </h3>
                <textarea
                  rows={5}
                  value={form.exclusions}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, exclusions: e.target.value }))
                  }
                  className="field-input"
                />
              </SurfaceCard>
            </div>
          </div>

          {/* Right Column - Fixed Preview */}
          {showPreview ? (
            <div className="xl:block">
              <div className="sticky top-4">
                <SurfaceCard className="h-fit">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMobile(false)}
                        className={`rounded-lg px-2 py-1 text-xs ${
                          !mobile
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        <FaDesktop className="mr-1 inline" /> Desktop
                      </button>
                      <button
                        onClick={() => setMobile(true)}
                        className={`rounded-lg px-2 py-1 text-xs ${
                          mobile
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        <FaMobileScreen className="mr-1 inline" /> Mobile
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-gray-700">
                        <FaArrowRotateRight className="mr-1 inline" /> Refresh
                      </button>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-gray-700"
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                  <div
                    ref={previewRef}
                    className={`mx-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 ${
                      mobile ? "max-w-[360px]" : "max-w-3xl"
                    }`}
                  >
                    <div className="mb-6 flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                          <FaPlaneDeparture />
                        </div>
                        <div>
                          <p className="font-semibold">Get2Vacation Travel CRM</p>
                          <p className="text-xs text-gray-500">
                            support@Get2Vacation.com
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">
                          QUOTATION
                        </p>
                        <p className="text-xs text-gray-500">#{form.quote}</p>
                      </div>
                    </div>
                    <div className="mb-5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{form.customer}</p>
                        <p className="text-xs text-gray-500">{form.email}</p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{form.destination}</p>
                        <p>
                          {form.nights} nights - {form.adults} adults
                        </p>
                      </div>
                    </div>
                    <div className="mb-5 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                      <div className="mb-2 flex justify-between text-xs text-gray-500">
                        <span>Travel Date</span>
                        <span>{form.startDate}</span>
                      </div>
                      <div className="mb-2 flex justify-between text-xs text-gray-500">
                        <span>Valid Until</span>
                        <span>{form.validUntil}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold">
                        <span>Total</span>
                        <span className="text-blue-600">{money(total)}</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                      <FaCheck className="mr-1 inline" /> Preview validated and
                      ready to share.
                    </div>
                  </div>
                </SurfaceCard>
              </div>
            </div>
          ) : (
            <SurfaceCard className="flex h-fit items-center justify-center sticky top-4">
              <button
                onClick={() => setShowPreview(true)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Show Preview
              </button>
            </SurfaceCard>
          )}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Add Itinerary Item
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="field-label">Day</label>
                  <input
                    className="field-input"
                    value={newItem.day}
                    onChange={(e) =>
                      setNewItem((p) => ({ ...p, day: e.target.value }))
                    }
                    placeholder="Day 3"
                  />
                </div>
                <div>
                  <label className="field-label">Title</label>
                  <input
                    className="field-input"
                    value={newItem.title}
                    onChange={(e) =>
                      setNewItem((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="Excursion / Transfer / Activity"
                  />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <textarea
                    rows={3}
                    className="field-input"
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Add short details for the guest"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={addItineraryItem}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save Item
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSaved && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <FaCheck className="text-xl" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Quotation saved
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Redirecting to quotations list...
            </p>
          </div>
        </div>
      )}
    </>
  );
};

const Field = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="field-label">{label}</label>
    <input
      className="field-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const NumberField = ({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) => (
  <div>
    <label className="field-label">{label}</label>
    <div className="flex items-center gap-2">
      {prefix ? (
        <span className="text-gray-500 dark:text-gray-400 text-sm">
          {prefix}
        </span>
      ) : null}
      <input
        type="number"
        className="field-input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
      />
    </div>
  </div>
);

const SummaryTile = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "purple";
}) => {
  const toneMap: Record<typeof tone, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200",
    green:
      "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200",
    purple:
      "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-200",
  };
  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-700 p-3 ${toneMap[tone]}`}
    >
      <p className="text-xs uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
};

export default QuotationBuilderPage;
