import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaCopy, FaDownload, FaEnvelope, FaEye, FaPlus, FaXmark } from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";
import StatusBadge from "../../components/ui/StatusBadge";
import FilterTabs from "../../components/ui/FilterTabs";
import EmptyState from "../../components/ui/EmptyState";
import { validateQuoteTransition } from "../../utils/workflowValidation";

type QuoteStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

type ComponentRow = {
  id: string;
  itemType: "HOTEL" | "FLIGHT" | "TRANSFER" | "VISA" | "INSURANCE" | "OTHER";
  description: string;
  cost: number;
};

const seedRows: ComponentRow[] = [
  { id: "1", itemType: "HOTEL", description: "5N Beach Resort", cost: 3200 },
  { id: "2", itemType: "TRANSFER", description: "Airport Return Transfer", cost: 220 },
  { id: "3", itemType: "VISA", description: "Tourist Visa Processing", cost: 180 },
];

const QuotationDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<QuoteStatus>("PENDING");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("components");
  const [rows] = useState(seedRows);

  const summary = useMemo(() => {
    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
    const marginPercent = 14;
    const discount = 120;
    const taxAmount = (totalCost - discount) * 0.1;
    const finalPrice = totalCost - discount + taxAmount;
    return { totalCost, marginPercent, discount, taxAmount, finalPrice };
  }, [rows]);

  const changeStatus = (nextStatus: QuoteStatus) => {
    if (nextStatus === "REJECTED") {
      const validationError = validateQuoteTransition("REJECTED", reason);
      setError(validationError);
      if (validationError) return;
    }
    setError("");
    setStatus(nextStatus);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate("/quotations")} className="mb-2 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            <FaArrowLeft /> Back to Quotations
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quotation Detail #{id}</h1>
          <p className="text-sm text-gray-500">Manage quote lifecycle, pricing, versions and send logs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={status} />
          <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"><FaDownload className="mr-2 inline" /> Generate PDF</button>
          <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"><FaEnvelope className="mr-2 inline" /> Send</button>
          <button onClick={() => changeStatus("APPROVED")} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><FaCheck className="mr-2 inline" /> Approve</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Cost", value: `$${summary.totalCost.toFixed(2)}` },
          { label: "Margin %", value: `${summary.marginPercent}%` },
          { label: "Discount", value: `$${summary.discount.toFixed(2)}` },
          { label: "Final Price", value: `$${summary.finalPrice.toFixed(2)}` },
        ].map((item) => (
          <SurfaceCard key={item.label} hoverable className="p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{item.value}</p>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="border-b border-gray-100 p-4 dark:border-gray-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterTabs
              tabs={[
                { id: "components", label: "Components" },
                { id: "versions", label: "Versions" },
                { id: "logs", label: "Send Logs & Views" },
              ]}
              active={tab}
              onChange={setTab}
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => changeStatus("PENDING")} className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-200">Mark Pending</button>
              <button onClick={() => changeStatus("REJECTED")} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600">Reject</button>
            </div>
          </div>
          {status === "REJECTED" ? (
            <div className="mt-3">
              <label className="field-label">Rejection Reason</label>
              <input value={reason} onChange={(event) => setReason(event.target.value)} className="field-input" placeholder="Reason is mandatory for REJECTED" />
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
        </div>

        {tab === "components" ? (
          <>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Itemized Components</h2>
              <button className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><FaPlus className="mr-1 inline" /> Add Item</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/95">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Cost</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((row) => (
                    <tr key={row.id} className="group hover:bg-blue-50/30 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.itemType}</td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.description}</td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">${row.cost.toFixed(2)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
                          <button className="rounded-lg border border-gray-200 p-2 text-gray-500 dark:border-gray-700"><FaCopy /></button>
                          <button className="rounded-lg border border-gray-200 p-2 text-red-500 dark:border-gray-700"><FaXmark /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {tab === "versions" ? (
          <div className="p-4">
            <EmptyState title="Version History" description="No additional versions yet. Save changes to generate quote versions." icon={<FaCopy />} />
          </div>
        ) : null}

        {tab === "logs" ? (
          <div className="p-4">
            <EmptyState title="Send Logs & Views" description="No send/view logs available yet for this quotation." icon={<FaEye />} />
          </div>
        ) : null}
      </SurfaceCard>
    </div>
  );
};

export default QuotationDetailPage;
