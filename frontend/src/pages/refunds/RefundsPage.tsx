import { useMemo, useState } from "react";
import { FaCheck, FaCircleXmark, FaMoneyBillTransfer, FaPlus } from "react-icons/fa6";
import { CurrencyInput, UUIDSelect } from "../../components/form";
import PermissionGate from "../../components/ui/PermissionGate";
import StatusBadge from "../../components/ui/StatusBadge";
import SurfaceCard from "../../components/ui/SurfaceCard";

type RefundStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";

type RefundRow = {
  id: string;
  bookingId: string;
  paymentId?: string;
  refundAmount: number;
  supplierPenalty: number;
  serviceCharge: number;
  status: RefundStatus;
};

const initialRows: RefundRow[] = [
  { id: "ref-1", bookingId: "BK-2034", paymentId: "PMT-2001", refundAmount: 500, supplierPenalty: 100, serviceCharge: 50, status: "PENDING" },
  { id: "ref-2", bookingId: "BK-2030", paymentId: "PMT-2002", refundAmount: 900, supplierPenalty: 0, serviceCharge: 0, status: "APPROVED" },
  { id: "ref-3", bookingId: "BK-2028", paymentId: "PMT-2003", refundAmount: 1200, supplierPenalty: 300, serviceCharge: 75, status: "PROCESSED" },
];

const RefundsPage = () => {
  const [rows, setRows] = useState(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bookingId: "", paymentId: "", refundAmount: "" as number | "", supplierPenalty: "" as number | "", serviceCharge: "" as number | "" });

  const bookingOptions = useMemo(() => rows.map((item) => ({ value: item.bookingId, label: item.bookingId })), [rows]);
  const paymentOptions = useMemo(() => rows.filter((item) => item.paymentId).map((item) => ({ value: item.paymentId as string, label: item.paymentId as string })), [rows]);

  const createRefund = () => {
    if (!form.bookingId || form.refundAmount === "") return;

    setRows((current) => [
      {
        id: `ref-${current.length + 1}`,
        bookingId: form.bookingId,
        paymentId: form.paymentId || undefined,
        refundAmount: Number(form.refundAmount),
        supplierPenalty: Number(form.supplierPenalty || 0),
        serviceCharge: Number(form.serviceCharge || 0),
        status: "PENDING",
      },
      ...current,
    ]);

    setForm({ bookingId: "", paymentId: "", refundAmount: "", supplierPenalty: "", serviceCharge: "" });
    setShowForm(false);
  };

  const updateStatus = (id: string, status: RefundStatus) => {
    setRows((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Refunds</h1>
          <p className="text-sm text-gray-500">Manage refund lifecycle and processing actions.</p>
        </div>
        <PermissionGate permission="refunds.write">
          <button onClick={() => setShowForm((open) => !open)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <FaPlus className="mr-2 inline" /> Create Refund
          </button>
        </PermissionGate>
      </div>

      {showForm ? (
        <SurfaceCard>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">New Refund</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UUIDSelect label="Booking ID" value={form.bookingId} onChange={(value) => setForm((current) => ({ ...current, bookingId: value }))} options={bookingOptions} required />
            <UUIDSelect label="Payment ID" value={form.paymentId} onChange={(value) => setForm((current) => ({ ...current, paymentId: value }))} options={paymentOptions} />
            <CurrencyInput label="Refund Amount" value={form.refundAmount} onChange={(value) => setForm((current) => ({ ...current, refundAmount: value }))} required />
            <CurrencyInput label="Supplier Penalty" value={form.supplierPenalty} onChange={(value) => setForm((current) => ({ ...current, supplierPenalty: value }))} />
            <CurrencyInput label="Service Charge" value={form.serviceCharge} onChange={(value) => setForm((current) => ({ ...current, serviceCharge: value }))} />
          </div>
          <button onClick={createRefund} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Save Refund
          </button>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="p-0 overflow-hidden">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/95">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Refund ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Booking</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Refund</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Charges</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">{row.id}</td>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.bookingId}</td>
                <td className="px-5 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">${row.refundAmount.toFixed(2)}</td>
                <td className="px-5 py-4 text-right text-sm text-gray-600 dark:text-gray-300">${(row.supplierPenalty + row.serviceCharge).toFixed(2)}</td>
                <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                <td className="px-5 py-4 text-right">
                  <PermissionGate permission="refunds.write">
                    <div className="inline-flex gap-2">
                      {row.status === "PENDING" ? <button onClick={() => updateStatus(row.id, "APPROVED")} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-green-600"><FaCheck className="mr-1 inline" />Approve</button> : null}
                      {row.status === "PENDING" ? <button onClick={() => updateStatus(row.id, "REJECTED")} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-red-600"><FaCircleXmark className="mr-1 inline" />Reject</button> : null}
                      {row.status === "APPROVED" ? <button onClick={() => updateStatus(row.id, "PROCESSED")} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-blue-600"><FaMoneyBillTransfer className="mr-1 inline" />Process</button> : null}
                    </div>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SurfaceCard>
    </div>
  );
};

export default RefundsPage;
