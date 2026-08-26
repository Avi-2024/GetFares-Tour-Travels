import React, { useCallback, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  settingsApi,
  type LeadStatusMainPayload,
  type LeadStatusSubPayload,
} from "../../api/settings";
import SearchableDropdown from "../ui/SearchableDropdown";
import {
  normalizeWorkflow,
  type CanonicalLeadStatus,
  type LeadStatusMain,
  type LeadStatusSub,
  type LeadStatusWorkflow,
} from "../../utils/leadStatus";

type Props = {
  canReadSettings: boolean;
  canUpdateSettings: boolean;
};

const CANONICAL_OPTIONS: Array<{
  value: CanonicalLeadStatus;
  label: string;
  helper: string;
}> = [
  { value: "OPEN", label: "OPEN", helper: "New or untouched lead" },
  { value: "CONTACTED", label: "CONTACTED", helper: "Contact has started" },
  { value: "WIP", label: "WIP", helper: "Quotation or sales work in progress" },
  { value: "QUOTED", label: "QUOTED", helper: "Quotation sent to customer" },
  { value: "FOLLOW_UP", label: "FOLLOW_UP", helper: "Active follow-up pipeline" },
  { value: "CONVERTED", label: "CONVERTED", helper: "Booking/customer won" },
  { value: "LOST", label: "LOST", helper: "Closed and lost" },
  {
    value: "NON_RESPONSIVE",
    label: "NON_RESPONSIVE",
    helper: "Closed because customer did not respond",
  },
];

const DEFAULT_MAIN_FORM: LeadStatusMainPayload = {
  label: "",
  canonicalStatus: "CONTACTED",
  sortOrder: 0,
  color: "#2563eb",
  isActive: true,
  requiresSubStatus: false,
  requiresQuotation: false,
  createsBooking: false,
  isBookingControlled: false,
  isTerminal: false,
};

const DEFAULT_SUB_FORM: LeadStatusSubPayload = {
  mainStatusId: "",
  label: "",
  sortOrder: 0,
  isActive: true,
  isTerminal: false,
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const unwrapWorkflow = (response: unknown) =>
  normalizeWorkflow((response as { data?: LeadStatusWorkflow })?.data);

const canonicalOptions = CANONICAL_OPTIONS.map((item) => ({
  value: item.value,
  label: `${item.label} - ${item.helper}`,
}));

const getCanonicalHelper = (canonicalStatus?: string) =>
  CANONICAL_OPTIONS.find((item) => item.value === canonicalStatus)?.helper ??
  "Backend-safe reporting status";

const countSubStatuses = (main: LeadStatusMain, workflow: LeadStatusWorkflow) =>
  workflow.subStatuses.filter(
    (item) =>
      item.mainStatusCode === main.code ||
      String(item.mainStatusId) === String(main.id),
  ).length;

const StatusBadge = ({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "blue" | "green" | "amber" | "red";
}) => {
  const tones = {
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200",
    green:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200",
    red: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
};

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
    {children}
  </div>
);

const SectionCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cx(
      "rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950",
      className,
    )}
  >
    {children}
  </div>
);

const WorkflowModal = ({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      aria-label="Close modal"
      className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div>
          <h3 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
        >
          Close
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const ToggleSwitch = ({
  checked,
  disabled,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description?: string;
  onChange: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onChange}
    className={cx(
      "flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition",
      checked
        ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
        : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900",
      disabled && "cursor-not-allowed opacity-60",
    )}
  >
    <span>
      <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
        {label}
      </span>
      {description ? (
        <span className="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </span>
      ) : null}
    </span>
    <span
      className={cx(
        "mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition",
        checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700",
      )}
    >
      <span
        className={cx(
          "h-4 w-4 rounded-full bg-white shadow transition",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </span>
  </button>
);

const FieldLabel = ({
  label,
  helper,
}: {
  label: string;
  helper?: string;
}) => (
  <label className="block">
    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
      {label}
    </span>
    {helper ? (
      <span className="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        {helper}
      </span>
    ) : null}
  </label>
);

const LeadStatusWorkflowPanel: React.FC<Props> = ({
  canReadSettings,
  canUpdateSettings,
}) => {
  const [workflow, setWorkflow] = useState<LeadStatusWorkflow>(
    normalizeWorkflow(null),
  );
  const [selectedMainId, setSelectedMainId] = useState("");
  const [mainForm, setMainForm] =
    useState<LeadStatusMainPayload>(DEFAULT_MAIN_FORM);
  const [subForm, setSubForm] =
    useState<LeadStatusSubPayload>(DEFAULT_SUB_FORM);
  const [showMainForm, setShowMainForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedMain = useMemo(
    () =>
      workflow.mainStatuses.find((item) => item.id === selectedMainId) ??
      workflow.mainStatuses[0] ??
      null,
    [selectedMainId, workflow.mainStatuses],
  );

  const subRows = useMemo(() => {
    if (!selectedMain) return [];
    return workflow.subStatuses
      .filter(
        (item) =>
          item.mainStatusCode === selectedMain.code ||
          String(item.mainStatusId) === String(selectedMain.id),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }, [selectedMain, workflow.subStatuses]);

  const mainOptions = useMemo(
    () =>
      workflow.mainStatuses.map((item) => ({
        value: item.id,
        label: item.label,
        rightLabel: item.canonicalStatus,
      })),
    [workflow.mainStatuses],
  );

  const workflowStats = useMemo(() => {
    const activeMain = workflow.mainStatuses.filter((item) => item.isActive);
    const activeSub = workflow.subStatuses.filter((item) => item.isActive);
    const terminalMain = workflow.mainStatuses.filter((item) => item.isTerminal);
    return {
      main: workflow.mainStatuses.length,
      sub: workflow.subStatuses.length,
      activeMain: activeMain.length,
      activeSub: activeSub.length,
      terminal: terminalMain.length,
    };
  }, [workflow]);

  const loadWorkflow = useCallback(async () => {
    if (!canReadSettings) return;
    setLoading(true);
    setError("");
    try {
      const next = unwrapWorkflow(await settingsApi.getLeadStatusWorkflow());
      setWorkflow(next);
      setSelectedMainId((current) =>
        next.mainStatuses.some((item) => item.id === current)
          ? current
          : next.mainStatuses[0]?.id ?? "",
      );
      setSubForm((form) => ({
        ...form,
        mainStatusId: form.mainStatusId || next.mainStatuses[0]?.id || "",
      }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load lead status workflow"));
    } finally {
      setLoading(false);
    }
  }, [canReadSettings]);

  React.useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  const applyWorkflowResponse = (response: unknown, successMessage: string) => {
    const next = unwrapWorkflow(response);
    setWorkflow(next);
    setMessage(successMessage);
    window.setTimeout(() => setMessage(""), 2200);
    return next;
  };

  const createMain = async () => {
    if (!canUpdateSettings) return;
    const label = mainForm.label.trim();
    if (!label) {
      setError("Main status label is required.");
      return;
    }
    setSaving("main:create");
    setError("");
    try {
      const next = applyWorkflowResponse(
        await settingsApi.createLeadStatusMain({
          ...mainForm,
          label,
          sortOrder: Number(mainForm.sortOrder || 0),
        }),
        "Main status created.",
      );
      const created = next.mainStatuses.find(
        (item) => item.label.toLowerCase() === label.toLowerCase(),
      );
      if (created) {
        setSelectedMainId(created.id);
        setSubForm((form) => ({ ...form, mainStatusId: created.id }));
      }
      setMainForm(DEFAULT_MAIN_FORM);
      setShowMainForm(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create main status"));
    } finally {
      setSaving("");
    }
  };

  const createSub = async () => {
    if (!canUpdateSettings) return;
    const parentId = subForm.mainStatusId || selectedMain?.id || "";
    const label = subForm.label.trim();
    if (!parentId) {
      setError("Select a parent main status first.");
      return;
    }
    if (!label) {
      setError("Sub-status label is required.");
      return;
    }
    setSaving("sub:create");
    setError("");
    try {
      applyWorkflowResponse(
        await settingsApi.createLeadStatusSub({
          ...subForm,
          mainStatusId: parentId,
          label,
          sortOrder: Number(subForm.sortOrder || 0),
        }),
        "Sub-status created.",
      );
      setSubForm({ ...DEFAULT_SUB_FORM, mainStatusId: parentId });
      setShowSubForm(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create sub-status"));
    } finally {
      setSaving("");
    }
  };

  const patchMain = async (
    row: LeadStatusMain,
    payload: Partial<LeadStatusMainPayload>,
  ) => {
    if (!canUpdateSettings) return;
    setSaving(`main:${row.id}`);
    setError("");
    try {
      applyWorkflowResponse(
        await settingsApi.updateLeadStatusMain(row.id, payload),
        "Main status updated.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update main status"));
    } finally {
      setSaving("");
    }
  };

  const patchSub = async (
    row: LeadStatusSub,
    payload: Partial<LeadStatusSubPayload>,
  ) => {
    if (!canUpdateSettings) return;
    setSaving(`sub:${row.id}`);
    setError("");
    try {
      applyWorkflowResponse(
        await settingsApi.updateLeadStatusSub(row.id, payload),
        "Sub-status updated.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update sub-status"));
    } finally {
      setSaving("");
    }
  };

  const selectMain = (id: string) => {
    setSelectedMainId(id);
    setSubForm((form) => ({ ...form, mainStatusId: id }));
  };

  if (!canReadSettings) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You need settings:read permission to view lead status workflow.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 shadow-sm dark:border-blue-900/50 dark:from-blue-950/30 dark:via-gray-950 dark:to-gray-950 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-200">
              Settings controlled workflow
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
              Lead Status Workflow
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Build user-friendly pipeline stages without breaking reports,
              SLA, quotations, bookings, or automation. Business users select
              main and sub-statuses; the backend keeps a stable canonical status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadWorkflow()}
              disabled={loading}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => setShowMainForm(true)}
              disabled={!canUpdateSettings}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add Main Status
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Main statuses", workflowStats.main],
            ["Active main", workflowStats.activeMain],
            ["Sub-statuses", workflowStats.sub],
            ["Active sub", workflowStats.activeSub],
            ["Terminal stages", workflowStats.terminal],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/70"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </p>
              <p className="mt-1 text-xl font-semibold text-gray-950 dark:text-gray-50">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SectionCard className="p-4">
          <StatusBadge tone="blue">Layer 1</StatusBadge>
          <h3 className="mt-3 text-sm font-semibold text-gray-950 dark:text-gray-50">
            Main Status
          </h3>
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            The stage users see on lead cards and filters, for example Follow
            Up or Closed.
          </p>
        </SectionCard>
        <SectionCard className="p-4">
          <StatusBadge tone="amber">Layer 2</StatusBadge>
          <h3 className="mt-3 text-sm font-semibold text-gray-950 dark:text-gray-50">
            Sub-Status
          </h3>
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            The exact reason or step inside the main status, for example Budget
            Issue or Follow up 2.
          </p>
        </SectionCard>
        <SectionCard className="p-4">
          <StatusBadge tone="green">Layer 3</StatusBadge>
          <h3 className="mt-3 text-sm font-semibold text-gray-950 dark:text-gray-50">
            Canonical Status
          </h3>
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Backend-safe value used by reports, automation, SLA, and booking
            logic. Change carefully.
          </p>
        </SectionCard>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}
      {!canUpdateSettings ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You can view this workflow, but you need settings:update permission
          to make changes.
        </div>
      ) : null}

      {showMainForm ? (
        <WorkflowModal
          title="Create Main Status"
          description="Add a business-facing stage and map it to one backend-safe canonical status."
          onClose={() => setShowMainForm(false)}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr_160px_120px]">
            <div>
              <FieldLabel label="Label" helper="Example: Payment Partially Received" />
              <input
                className="field-input mt-1"
                placeholder="Main status label"
                value={mainForm.label}
                onChange={(event) =>
                  setMainForm((form) => ({ ...form, label: event.target.value }))
                }
              />
            </div>
            <div>
              <FieldLabel
                label="Canonical mapping"
                helper="Reports and automation use this value."
              />
              <SearchableDropdown
                className="mt-1"
                value={mainForm.canonicalStatus}
                options={canonicalOptions}
                onChange={(value) =>
                  setMainForm((form) => ({
                    ...form,
                    canonicalStatus: value as CanonicalLeadStatus,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel label="Sort order" />
              <input
                type="number"
                className="field-input mt-1"
                value={mainForm.sortOrder ?? 0}
                onChange={(event) =>
                  setMainForm((form) => ({
                    ...form,
                    sortOrder: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel label="Color" />
              <input
                type="color"
                className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800"
                value={mainForm.color || "#2563eb"}
                onChange={(event) =>
                  setMainForm((form) => ({ ...form, color: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ToggleSwitch
              checked={Boolean(mainForm.requiresSubStatus)}
              label="Requires sub-status"
              description="User must select a child status before saving."
              onChange={() =>
                setMainForm((form) => ({
                  ...form,
                  requiresSubStatus: !form.requiresSubStatus,
                }))
              }
            />
            <ToggleSwitch
              checked={Boolean(mainForm.requiresQuotation)}
              label="Requires quotation"
              description="Use for statuses that should not proceed without quote context."
              onChange={() =>
                setMainForm((form) => ({
                  ...form,
                  requiresQuotation: !form.requiresQuotation,
                }))
              }
            />
            <ToggleSwitch
              checked={Boolean(mainForm.isTerminal)}
              label="Terminal stage"
              description="Marks the workflow as an end state."
              onChange={() =>
                setMainForm((form) => ({
                  ...form,
                  isTerminal: !form.isTerminal,
                }))
              }
            />
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowMainForm(false)}
              className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void createMain()}
              disabled={!canUpdateSettings || saving === "main:create"}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving === "main:create" ? "Creating..." : "Create Main Status"}
            </button>
          </div>
        </WorkflowModal>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <SectionCard className="overflow-hidden">
          <div className="border-b border-gray-100 p-4 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-950 dark:text-gray-50">
              Main Statuses
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Select a stage to edit rules and sub-statuses.
            </p>
          </div>
          <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
            {workflow.mainStatuses.length ? (
              workflow.mainStatuses.map((row) => {
                const selected = selectedMain?.id === row.id;
                const subCount = countSubStatuses(row, workflow);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => selectMain(row.id)}
                    className={cx(
                      "w-full rounded-2xl border p-3 text-left transition",
                      selected
                        ? "border-blue-300 bg-blue-50 shadow-sm dark:border-blue-800 dark:bg-blue-950/30"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: row.color || "#2563eb" }}
                          />
                          <p className="truncate text-sm font-semibold text-gray-950 dark:text-gray-50">
                            {row.label}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {row.code}
                        </p>
                      </div>
                      <StatusBadge tone={row.isActive ? "green" : "gray"}>
                        {row.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge tone="blue">{row.canonicalStatus}</StatusBadge>
                      <StatusBadge>{subCount} sub</StatusBadge>
                      {row.isTerminal ? <StatusBadge tone="red">Terminal</StatusBadge> : null}
                      {row.isSystem ? <StatusBadge>System</StatusBadge> : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState>No main statuses configured.</EmptyState>
            )}
          </div>
        </SectionCard>

        <div className="space-y-5">
          {selectedMain ? (
            <SectionCard className="p-4 sm:p-5" key={selectedMain.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: selectedMain.color || "#2563eb" }}
                    />
                    <h3 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
                      Edit Main Status
                    </h3>
                    <StatusBadge tone={selectedMain.isActive ? "green" : "gray"}>
                      {selectedMain.isActive ? "Active" : "Inactive"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Changes here affect what users can select on lead details.
                    Canonical status keeps reporting stable.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canUpdateSettings || saving === `main:${selectedMain.id}`}
                  onClick={() =>
                    void patchMain(selectedMain, {
                      isActive: !selectedMain.isActive,
                    })
                  }
                  className={cx(
                    "rounded-2xl px-4 py-2 text-sm font-semibold",
                    selectedMain.isActive
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-emerald-600 text-white hover:bg-emerald-700",
                    (!canUpdateSettings || saving === `main:${selectedMain.id}`) &&
                      "opacity-50",
                  )}
                >
                  {selectedMain.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <FieldLabel label="Business label" />
                  <input
                    className="field-input mt-1"
                    defaultValue={selectedMain.label}
                    disabled={!canUpdateSettings}
                    onBlur={(event) => {
                      const label = event.target.value.trim();
                      if (label && label !== selectedMain.label) {
                        void patchMain(selectedMain, { label });
                      }
                    }}
                  />
                </div>
                <div>
                  <FieldLabel
                    label="Canonical status"
                    helper={getCanonicalHelper(selectedMain.canonicalStatus)}
                  />
                  <SearchableDropdown
                    className="mt-1"
                    value={selectedMain.canonicalStatus}
                    options={canonicalOptions}
                    disabled={!canUpdateSettings}
                    onChange={(value) =>
                      void patchMain(selectedMain, {
                        canonicalStatus: value as CanonicalLeadStatus,
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel label="Sort order" />
                  <input
                    type="number"
                    className="field-input mt-1"
                    defaultValue={selectedMain.sortOrder}
                    disabled={!canUpdateSettings}
                    onBlur={(event) => {
                      const sortOrder = Number(event.target.value || 0);
                      if (sortOrder !== selectedMain.sortOrder) {
                        void patchMain(selectedMain, { sortOrder });
                      }
                    }}
                  />
                </div>
                <div>
                  <FieldLabel label="Badge color" />
                  <input
                    type="color"
                    className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800"
                    value={selectedMain.color || "#2563eb"}
                    disabled={!canUpdateSettings}
                    onChange={(event) =>
                      void patchMain(selectedMain, { color: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ToggleSwitch
                  checked={selectedMain.requiresSubStatus}
                  disabled={!canUpdateSettings}
                  label="Requires sub-status"
                  description="Force user to choose a child status."
                  onChange={() =>
                    void patchMain(selectedMain, {
                      requiresSubStatus: !selectedMain.requiresSubStatus,
                    })
                  }
                />
                <ToggleSwitch
                  checked={selectedMain.requiresQuotation}
                  disabled={!canUpdateSettings}
                  label="Requires quotation"
                  description="Keep quotation-dependent steps protected."
                  onChange={() =>
                    void patchMain(selectedMain, {
                      requiresQuotation: !selectedMain.requiresQuotation,
                    })
                  }
                />
                <ToggleSwitch
                  checked={selectedMain.createsBooking}
                  disabled={!canUpdateSettings}
                  label="Creates booking"
                  description="Use only for workflow steps that should create a booking."
                  onChange={() =>
                    void patchMain(selectedMain, {
                      createsBooking: !selectedMain.createsBooking,
                    })
                  }
                />
                <ToggleSwitch
                  checked={selectedMain.isBookingControlled}
                  disabled={!canUpdateSettings}
                  label="Booking controlled"
                  description="Booking/payment modules should control this status."
                  onChange={() =>
                    void patchMain(selectedMain, {
                      isBookingControlled: !selectedMain.isBookingControlled,
                    })
                  }
                />
                <ToggleSwitch
                  checked={selectedMain.isTerminal}
                  disabled={!canUpdateSettings}
                  label="Terminal stage"
                  description="Marks this status as an end state."
                  onChange={() =>
                    void patchMain(selectedMain, {
                      isTerminal: !selectedMain.isTerminal,
                    })
                  }
                />
              </div>
            </SectionCard>
          ) : (
            <SectionCard className="p-5">
              <EmptyState>Select a main status to edit workflow rules.</EmptyState>
            </SectionCard>
          )}

          <SectionCard className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
                  Sub-Statuses
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Manage detailed reasons or steps under{" "}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedMain?.label || "selected main status"}
                  </span>
                  .
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="w-full sm:w-72">
                  <SearchableDropdown
                    value={selectedMain?.id || ""}
                    options={mainOptions}
                    onChange={selectMain}
                    placeholder="Select main status"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubForm(true);
                    setSubForm((form) => ({
                      ...form,
                      mainStatusId: selectedMain?.id || form.mainStatusId,
                    }));
                  }}
                  disabled={!canUpdateSettings || !selectedMain}
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Sub-Status
                </button>
              </div>
            </div>

            {showSubForm ? (
              <WorkflowModal
                title="Create Sub-Status"
                description={`Add a detailed child status under ${
                  selectedMain?.label || "the selected main status"
                }.`}
                onClose={() => setShowSubForm(false)}
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_140px_180px]">
                  <div>
                    <FieldLabel
                      label="Sub-status label"
                      helper="Example: 2 - No response or Budget Issue"
                    />
                    <input
                      className="field-input mt-1"
                      placeholder="Sub-status label"
                      value={subForm.label}
                      onChange={(event) =>
                        setSubForm((form) => ({
                          ...form,
                          label: event.target.value,
                          mainStatusId: selectedMain?.id || form.mainStatusId,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel label="Sort order" />
                    <input
                      type="number"
                      className="field-input mt-1"
                      value={subForm.sortOrder ?? 0}
                      onChange={(event) =>
                        setSubForm((form) => ({
                          ...form,
                          sortOrder: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => void createSub()}
                      disabled={!canUpdateSettings || saving === "sub:create"}
                      className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving === "sub:create" ? "Creating..." : "Create Sub-Status"}
                    </button>
                  </div>
                </div>
              </WorkflowModal>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {subRows.length ? (
                subRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <input
                          className="field-input !py-2"
                          defaultValue={row.label}
                          disabled={!canUpdateSettings}
                          onBlur={(event) => {
                            const label = event.target.value.trim();
                            if (label && label !== row.label) {
                              void patchSub(row, { label });
                            }
                          }}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusBadge>{row.code}</StatusBadge>
                          {row.isSystem ? <StatusBadge>System</StatusBadge> : null}
                          {row.isTerminal ? (
                            <StatusBadge tone="red">Terminal</StatusBadge>
                          ) : null}
                        </div>
                      </div>
                      <StatusBadge tone={row.isActive ? "green" : "gray"}>
                        {row.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[130px_1fr]">
                      <div>
                        <FieldLabel label="Order" />
                        <input
                          type="number"
                          className="field-input mt-1 !py-2"
                          defaultValue={row.sortOrder}
                          disabled={!canUpdateSettings}
                          onBlur={(event) => {
                            const sortOrder = Number(event.target.value || 0);
                            if (sortOrder !== row.sortOrder) {
                              void patchSub(row, { sortOrder });
                            }
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 self-end">
                        <button
                          type="button"
                          disabled={!canUpdateSettings || saving === `sub:${row.id}`}
                          onClick={() =>
                            void patchSub(row, { isTerminal: !row.isTerminal })
                          }
                          className={cx(
                            "rounded-xl px-3 py-2 text-xs font-semibold",
                            row.isTerminal
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-100 text-gray-600",
                            (!canUpdateSettings || saving === `sub:${row.id}`) &&
                              "opacity-50",
                          )}
                        >
                          {row.isTerminal ? "Terminal" : "Not terminal"}
                        </button>
                        <button
                          type="button"
                          disabled={!canUpdateSettings || saving === `sub:${row.id}`}
                          onClick={() =>
                            void patchSub(row, { isActive: !row.isActive })
                          }
                          className={cx(
                            "rounded-xl px-3 py-2 text-xs font-semibold",
                            row.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600",
                            (!canUpdateSettings || saving === `sub:${row.id}`) &&
                              "opacity-50",
                          )}
                        >
                          {row.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="lg:col-span-2 2xl:col-span-3">
                  <EmptyState>
                    No sub-statuses for this main status. Add one if this stage
                    needs detailed reasons or follow-up steps.
                  </EmptyState>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default LeadStatusWorkflowPanel;
