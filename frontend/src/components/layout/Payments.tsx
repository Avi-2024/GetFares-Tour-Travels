import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBuildingColumns,
  FaChevronLeft,
  FaChevronRight,
  FaCircleCheck,
  FaClockRotateLeft,
  FaCreditCard,
  FaDownload,
  FaListUl,
  FaMagnifyingGlass,
  FaMoneyBill,
  FaPlus,
  FaRotateLeft,
  FaRotateRight,
  FaWallet,
  FaXmark,
} from "react-icons/fa6";
import SurfaceCard from "../ui/SurfaceCard";
import EmptyState from "../ui/EmptyState";

type TxStatus = "completed" | "pending" | "failed" | "refunded";

interface Transaction {
  id: string;
  referenceId: string;
  date: string;
  customer: string;
  bookingId: string;
  amount: number;
  mode: "bank" | "card" | "cash";
  status: TxStatus;
}

const statusClasses: Record<TxStatus, string> = {
  completed: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900",
  pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900",
  failed: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900",
  refunded: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const transactions: Transaction[] = [
  { id: "1", referenceId: "TRX-8902", date: "Mar 09, 2026", customer: "Sarah Jenkins", bookingId: "BK-2034", amount: 1200, mode: "card", status: "completed" },
  { id: "2", referenceId: "TRX-8901", date: "Mar 08, 2026", customer: "Emma Wilson", bookingId: "BK-2030", amount: 5400, mode: "bank", status: "completed" },
  { id: "3", referenceId: "TRX-8895", date: "Mar 07, 2026", customer: "James Lee", bookingId: "BK-2028", amount: -8200, mode: "bank", status: "refunded" },
  { id: "4", referenceId: "TRX-8888", date: "Mar 05, 2026", customer: "Michael Ross", bookingId: "BK-2033", amount: 2800, mode: "card", status: "failed" },
];

const Payments: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TxStatus>("all");
  const [showPanel, setShowPanel] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 4;

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const statusMatch = statusFilter === "all" || tx.status === statusFilter;
      const searchMatch =
        tx.referenceId.toLowerCase().includes(search.toLowerCase()) ||
        tx.customer.toLowerCase().includes(search.toLowerCase()) ||
        tx.bookingId.toLowerCase().includes(search.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const modeIcon = (mode: Transaction["mode"]) => {
    if (mode === "bank") return <FaBuildingColumns className="text-gray-500" />;
    if (mode === "card") return <FaCreditCard className="text-blue-600" />;
    return <FaMoneyBill className="text-green-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track transactions, statuses, and receipts in real time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowPanel(true)}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700"
          >
            <FaPlus className="mr-2" /> Add Payment
          </button>
          <button onClick={() => navigate("/refunds")} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
            Create Refund
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Collected (Month)" value="$48,250" subtitle="+8%" icon={<FaWallet className="text-blue-600" />} />
        <StatCard title="Outstanding" value="$12,400" subtitle="14 pending" icon={<FaClockRotateLeft className="text-amber-500" />} />
        <StatCard title="Overdue" value="$3,200" subtitle="3 invoices" icon={<FaRotateRight className="text-red-500" />} />
        <StatCard title="Refunds" value="$1,850" subtitle="This month" icon={<FaRotateLeft className="text-gray-500" />} />
      </div>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="border-b border-gray-100 p-4 dark:border-gray-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-xs text-gray-400" />
                <input
                  className="field-input pl-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by transaction, customer, booking"
                />
              </div>
              <select
                className="field-input w-full sm:w-44"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "all" | TxStatus);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <button className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
              <FaDownload className="mr-2" /> Export CSV
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No transactions" description="Try a different filter or add a new payment." icon={<FaListUl />} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Mode</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">#{tx.referenceId}</td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{tx.date}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tx.customer}</p>
                        <p className="text-xs text-gray-500">#{tx.bookingId}</p>
                      </td>
                      <td className={`px-5 py-4 text-right text-sm font-semibold ${tx.amount < 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
                        {tx.amount < 0 ? "-" : ""}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          {modeIcon(tx.mode)} {tx.mode}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses[tx.status]}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 p-4 dark:border-gray-800">
              <p className="text-sm text-gray-500">Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-{Math.min(filtered.length, page * pageSize)} of {filtered.length}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                >
                  <FaChevronLeft />
                </button>
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{page}</span>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </SurfaceCard>

      {showPanel ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add New Payment</h2>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <FaXmark />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="field-label">Booking / Customer</label>
                <input className="field-input" placeholder="Search booking ID or customer" />
              </div>
              <div>
                <label className="field-label">Amount</label>
                <input type="number" className="field-input" placeholder="0.00" />
              </div>
              <div>
                <label className="field-label">Payment Mode</label>
                <select className="field-input">
                  <option>Bank Transfer</option>
                  <option>Card</option>
                  <option>Cash</option>
                </select>
              </div>
              <div>
                <label className="field-label">Reference ID</label>
                <input className="field-input" placeholder="TRX-0001" />
              </div>
              <button className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <FaCircleCheck className="mr-2 inline" /> Record Payment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) => (
  <SurfaceCard hoverable className="p-5">
    <div className="mb-2 flex items-center justify-between">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      {icon}
    </div>
    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
  </SurfaceCard>
);

export default Payments;
