import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import FilterTabs from "../../components/ui/FilterTabs";
import StatusBadge from "../../components/ui/StatusBadge";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { SUPPLIERS } from "../../data/staticLists";

type VisaStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

type VisaCase = {
  id: string;
  bookingId: string;
  country: string;
  visaType: string;
  status: VisaStatus;
  appointmentDate: string;
  submissionDate: string;
  visaValidUntil?: string;
  supplierId: string;
};

const rows: VisaCase[] = [
  { id: "visa-1", bookingId: "BK-2034", country: "Maldives", visaType: "Tourist", status: "SUBMITTED", appointmentDate: "2026-03-16", submissionDate: "2026-03-10", supplierId: "sup-2" },
  { id: "visa-2", bookingId: "BK-2030", country: "France", visaType: "Schengen", status: "APPROVED", appointmentDate: "2026-03-08", submissionDate: "2026-03-03", visaValidUntil: "2026-09-08", supplierId: "sup-2" },
  { id: "visa-3", bookingId: "BK-2028", country: "Japan", visaType: "Tourist", status: "REJECTED", appointmentDate: "2026-02-20", submissionDate: "2026-02-15", supplierId: "sup-1" },
];

const tabs = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
];

const VisaCasesPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("ALL");

  const filtered = useMemo(() => rows.filter((row) => tab === "ALL" || row.status === tab), [tab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Visa Cases</h1>
          <p className="text-sm text-gray-500">Track visa pipeline, appointments and approvals.</p>
        </div>
        <button onClick={() => navigate("/visa/visa-1")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <FaPlus className="mr-2 inline" /> Create Visa Case
        </button>
      </div>

      <FilterTabs tabs={tabs} active={tab} onChange={setTab} />

      <SurfaceCard className="p-0 overflow-hidden">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/95">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Visa Case ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Booking</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Country</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Appointment</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">{row.id}</td>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.bookingId}</td>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.country}</td>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.visaType}</td>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{SUPPLIERS.find((supplier) => supplier.id === row.supplierId)?.name ?? "-"}</td>
                <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.appointmentDate}</td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => navigate(`/visa/${row.id}`)} className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SurfaceCard>
    </div>
  );
};

export default VisaCasesPage;
