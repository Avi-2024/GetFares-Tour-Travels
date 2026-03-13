import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarDays, FaChevronLeft, FaChevronRight, FaCopy, FaEllipsis, FaEye, FaFileInvoice, FaMagnifyingGlass, FaPlus, FaWhatsapp } from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";
import EmptyState from "../../components/ui/EmptyState";
import { validateQuoteTransition } from "../../utils/workflowValidation";

type Status = "pending" | "accepted" | "expired" | "rejected" | "draft";
interface Quotation { id: string; quoteNumber: string; customer: string; email: string; destination: string; details: string; total: number; margin: number; status: Status; lastSent: string | null; }

const items: Quotation[] = [
  { id: "1", quoteNumber: "QT-2026-089", customer: "Sarah Jenkins", email: "sarah.j@example.com", destination: "Maldives Retreat", details: "5 Nights - All Inclusive", total: 4250, margin: 12, status: "pending", lastSent: "Mar 9 - Email" },
  { id: "2", quoteNumber: "QT-2026-088", customer: "Michael Ross", email: "m.ross@company.com", destination: "Tokyo Business Trip", details: "7 Nights - Hotel Only", total: 2800, margin: 15, status: "accepted", lastSent: "Mar 8 - WhatsApp" },
  { id: "3", quoteNumber: "QT-2026-085", customer: "Emma Lewis", email: "emma.l@gmail.com", destination: "Paris Family Vacation", details: "10 Nights - Package", total: 8450, margin: 10, status: "expired", lastSent: "Mar 2 - Email" },
  { id: "4", quoteNumber: "Draft", customer: "David Kim", email: "New Lead", destination: "Bali Honeymoon", details: "14 Nights", total: 5100, margin: 0, status: "draft", lastSent: null },
];
const tabs = ["All", "pending", "accepted", "expired", "rejected", "draft"] as const;
const styles: Record<Status, string> = { pending: "bg-amber-100 text-amber-700 border-amber-200", accepted: "bg-green-100 text-green-700 border-green-200", expired: "bg-red-100 text-red-700 border-red-200", rejected: "bg-red-100 text-red-700 border-red-200", draft: "bg-gray-100 text-gray-700 border-gray-200" };

const QuotationsPage: React.FC = () => {
  const nav = useNavigate();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const pageSize = 4;

  const filtered = useMemo(() => items.filter((q) => (tab === "All" || q.status === tab) && (`${q.quoteNumber} ${q.customer} ${q.destination}`).toLowerCase().includes(search.toLowerCase())), [tab, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rejectQuotation = () => {
    const reason = window.prompt("Reason is required for REJECTED status.");
    const validationError = validateQuoteTransition("REJECTED", reason ?? "");
    setError(validationError);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quotations</h1><p className="text-sm text-gray-500">Manage, track, and convert quotations faster.</p></div><button onClick={() => nav("/quotations/builder")} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><FaPlus className="mr-2" /> Create Quotation</button></div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ t: "Total Active", v: "142", c: "+12%" }, { t: "Pending", v: "28", c: "Attention" }, { t: "Converted", v: "45", c: "This Month" }, { t: "Value", v: "$342,800", c: "USD" }].map((k) => <SurfaceCard key={k.t} hoverable className="p-5"><div className="mb-2 flex justify-between"><p className="text-xs uppercase tracking-wide text-gray-500">{k.t}</p><span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">{k.c}</span></div><p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{k.v}</p></SurfaceCard>)}</div>

      <SurfaceCard className="p-0 overflow-hidden">
        {error ? <p className="border-b border-gray-100 px-4 py-2 text-sm text-red-500 dark:border-gray-800">{error}</p> : null}
        <div className="border-b border-gray-100 p-4 dark:border-gray-800"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1 lg:w-auto dark:border-gray-700 dark:bg-gray-800">{tabs.map((t) => <button key={t} onClick={() => { setTab(t); setPage(1); }} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-white text-blue-600 dark:bg-gray-700" : "text-gray-600 dark:text-gray-300"}`}>{t}</button>)}</div><div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><div className="relative w-full sm:w-80"><FaMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-xs text-gray-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="field-input pl-9" placeholder="Search quote, customer, destination" /></div><button className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"><FaCalendarDays className="mr-2" /> Date Range</button></div></div></div>

        {rows.length === 0 ? <div className="p-4"><EmptyState title="No quotations found" description="Try different filters or create a new quotation." icon={<FaFileInvoice />} /></div> : <><div className="overflow-x-auto"><table className="min-w-[980px] w-full divide-y divide-gray-200 dark:divide-gray-800"><thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95"><tr><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Quote #</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Destination</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th><th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Last Sent</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{rows.map((q) => <tr key={q.id} className="group hover:bg-blue-50/30 dark:hover:bg-gray-800/40"><td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">{q.quoteNumber}</td><td className="px-5 py-4"><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{q.customer}</p><p className="text-xs text-gray-500">{q.email}</p></td><td className="px-5 py-4"><p className="text-sm text-gray-800 dark:text-gray-100">{q.destination}</p><p className="text-xs text-gray-500">{q.details}</p></td><td className="px-5 py-4 text-right"><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">${q.total.toFixed(2)}</p><p className="text-xs text-green-600">Margin {q.margin}%</p></td><td className="px-5 py-4 text-center"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[q.status]}`}>{q.status}</span></td><td className="px-5 py-4 text-xs text-gray-500">{q.lastSent ?? "Never Sent"}</td><td className="px-5 py-4"><div className="flex justify-end gap-2 transition-all duration-200"><button onClick={() => nav(`/quotations/${q.id}`)} className="rounded-lg border border-gray-200 p-2 text-gray-500 dark:border-gray-700"><FaEye /></button><button className="rounded-lg border border-gray-200 p-2 text-green-600 dark:border-gray-700"><FaWhatsapp /></button><button className="rounded-lg border border-gray-200 p-2 text-gray-500 dark:border-gray-700"><FaCopy /></button><button onClick={rejectQuotation} className="rounded-lg border border-gray-200 p-2 text-red-600 dark:border-gray-700"><FaEllipsis /></button></div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-gray-100 p-4 dark:border-gray-800"><p className="text-sm text-gray-500">Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-{Math.min(filtered.length, page * pageSize)} of {filtered.length}</p><div className="flex gap-2"><button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700"><FaChevronLeft /></button><span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{page}</span><button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700"><FaChevronRight /></button></div></div></>}
      </SurfaceCard>
    </div>
  );
};

export default QuotationsPage;

