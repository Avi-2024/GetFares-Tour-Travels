import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DateInput } from "../../components/form";
import FilterTabs from "../../components/ui/FilterTabs";
import SurfaceCard from "../../components/ui/SurfaceCard";

const reportTabs = [
  { id: "leads_by_source", label: "Leads by Source" },
  { id: "revenue_monthly", label: "Revenue Monthly" },
  { id: "outstanding_payments", label: "Outstanding" },
];

const dataMap = {
  leads_by_source: [
    { label: "Website", value: 82 },
    { label: "Meta Ads", value: 63 },
    { label: "Referral", value: 24 },
    { label: "Walk-in", value: 11 },
  ],
  revenue_monthly: [
    { label: "Jan", value: 98000 },
    { label: "Feb", value: 103000 },
    { label: "Mar", value: 118000 },
    { label: "Apr", value: 126000 },
  ],
  outstanding_payments: [
    { label: "BK-2034", value: 1200 },
    { label: "BK-2033", value: 2800 },
    { label: "BK-2029", value: 650 },
  ],
};

const ReportsHubPage = () => {
  const [tab, setTab] = useState("leads_by_source");
  const [from, setFrom] = useState("2026-03-01");
  const [to, setTo] = useState("2026-03-12");

  const rows = useMemo(() => dataMap[tab as keyof typeof dataMap], [tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports Hub</h1>
        <p className="text-sm text-gray-500">Unified analytics for leads, revenue, payments and operations.</p>
      </div>

      <SurfaceCard>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <FilterTabs tabs={reportTabs} active={tab} onChange={setTab} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateInput label="From" value={from} onChange={setFrom} />
            <DateInput label="To" value={to} onChange={setTo} />
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Report Table</h2>
          <button className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Export CSV</button>
        </div>
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/95">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Label</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.label}</td>
                <td className="px-5 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">{row.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SurfaceCard>
    </div>
  );
};

export default ReportsHubPage;
