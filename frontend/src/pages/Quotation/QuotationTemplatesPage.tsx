import React, { useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import TextInput from "../../components/form/TextInput";
import NumberInput from "../../components/form/NumberInput";

type TemplateType = "STANDARD" | "PREMIUM" | "CORPORATE";

type TemplateRow = {
  id: string;
  code: string;
  name: string;
  templateType: TemplateType;
  minMarginPercent: number;
  isActive: boolean;
  updatedAt: string;
};

const seedRows: TemplateRow[] = [
  { id: "tpl-1", code: "STD", name: "Standard Leisure", templateType: "STANDARD", minMarginPercent: 8, isActive: true, updatedAt: "2026-03-10" },
  { id: "tpl-2", code: "VIP", name: "Luxury Premium", templateType: "PREMIUM", minMarginPercent: 15, isActive: true, updatedAt: "2026-03-08" },
  { id: "tpl-3", code: "CORP", name: "Corporate Fast Quote", templateType: "CORPORATE", minMarginPercent: 6, isActive: false, updatedAt: "2026-03-02" },
];

const QuotationTemplatesPage: React.FC = () => {
  const [rows, setRows] = useState(seedRows);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", templateType: "STANDARD" as TemplateType, minMarginPercent: 0, isActive: true });
  const pageSize = 4;

  const filtered = useMemo(
    () => rows.filter((row) => (`${row.code} ${row.name} ${row.templateType}`).toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditingId(null);
    setForm({ code: "", name: "", templateType: "STANDARD", minMarginPercent: 0, isActive: true });
    setShowForm(true);
  };

  const openEdit = (row: TemplateRow) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      templateType: row.templateType,
      minMarginPercent: row.minMarginPercent,
      isActive: row.isActive,
    });
    setShowForm(true);
  };

  const saveTemplate = () => {
    if (!form.code.trim() || !form.name.trim()) return;

    if (editingId) {
      setRows((current) =>
        current.map((row) =>
          row.id === editingId
            ? {
                ...row,
                code: form.code,
                name: form.name,
                templateType: form.templateType,
                minMarginPercent: Number(form.minMarginPercent),
                isActive: form.isActive,
                updatedAt: "2026-03-12",
              }
            : row
        )
      );
    } else {
      setRows((current) => [
        {
          id: `tpl-${current.length + 1}`,
          code: form.code,
          name: form.name,
          templateType: form.templateType,
          minMarginPercent: Number(form.minMarginPercent),
          isActive: form.isActive,
          updatedAt: "2026-03-12",
        },
        ...current,
      ]);
    }

    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quotation Templates</h1>
          <p className="text-sm text-gray-500">Manage reusable quotation templates and default margin guardrails.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <FaPlus className="mr-2" /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Total Templates", value: rows.length.toString(), chip: "All" },
          { title: "Active", value: rows.filter((row) => row.isActive).length.toString(), chip: "Live" },
          { title: "Inactive", value: rows.filter((row) => !row.isActive).length.toString(), chip: "Disabled" },
          { title: "Avg Min Margin", value: `${Math.round(rows.reduce((sum, row) => sum + row.minMarginPercent, 0) / rows.length)}%`, chip: "Policy" },
        ].map((card) => (
          <SurfaceCard key={card.title} hoverable className="p-5">
            <div className="mb-2 flex justify-between">
              <p className="text-xs uppercase tracking-wide text-gray-500">{card.title}</p>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">{card.chip}</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{card.value}</p>
          </SurfaceCard>
        ))}
      </div>

      {showForm ? (
        <SurfaceCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingId ? "Edit Template" : "Create Template"}</h2>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-200">Close</button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput label="Template Code" value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} required />
            <TextInput label="Template Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
            <div>
              <label className="field-label">Template Type</label>
              <select className="field-input" value={form.templateType} onChange={(event) => setForm((current) => ({ ...current, templateType: event.target.value as TemplateType }))}>
                <option value="STANDARD">STANDARD</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="CORPORATE">CORPORATE</option>
              </select>
            </div>
            <NumberInput label="Min Margin %" value={form.minMarginPercent} onChange={(value) => setForm((current) => ({ ...current, minMarginPercent: Number(value || 0) }))} min={0} step={1} />
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Active Template
          </label>
          <button onClick={saveTemplate} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Template</button>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="border-b border-gray-100 p-4 dark:border-gray-800">
          <div className="relative w-full md:w-96">
            <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-xs text-gray-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="field-input pl-9"
              placeholder="Search code, template name, type"
            />
          </div>
        </div>

        {pageRows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No templates found" description="Try another search or create a new template." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Template Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Min Margin %</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Updated At</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pageRows.map((row) => (
                    <tr key={row.id} className="group hover:bg-blue-50/30 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">{row.code}</td>
                      <td className="px-5 py-4 text-sm text-gray-800 dark:text-gray-100">{row.name}</td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.templateType}</td>
                      <td className="px-5 py-4 text-right text-sm text-gray-700 dark:text-gray-200">{row.minMarginPercent}%</td>
                      <td className="px-5 py-4"><StatusBadge status={row.isActive ? "Approved" : "Draft"} /></td>
                      <td className="px-5 py-4 text-xs text-gray-500">{row.updatedAt}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
                          <button onClick={() => openEdit(row)} className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-200">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 p-4 dark:border-gray-800">
              <p className="text-sm text-gray-500">Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-{Math.min(filtered.length, page * pageSize)} of {filtered.length}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700"><FaChevronLeft /></button>
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{page}</span>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700"><FaChevronRight /></button>
              </div>
            </div>
          </>
        )}
      </SurfaceCard>
    </div>
  );
};

export default QuotationTemplatesPage;
