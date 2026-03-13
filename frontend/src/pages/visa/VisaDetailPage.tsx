import { useState } from "react";
import { useParams } from "react-router-dom";
import { FaListCheck, FaPassport } from "react-icons/fa6";
import { DateInput, TextInput } from "../../components/form";
import AuditMeta from "../../components/ui/AuditMeta";
import StatusBadge from "../../components/ui/StatusBadge";
import SurfaceCard from "../../components/ui/SurfaceCard";
import Timeline from "../../components/ui/Timeline";
import { validateVisaTransition } from "../../utils/workflowValidation";

const VisaDetailPage = () => {
  const { id } = useParams();
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED">("SUBMITTED");
  const [rejectionReason, setRejectionReason] = useState("");
  const [visaValidUntil, setVisaValidUntil] = useState("");
  const [error, setError] = useState("");
  const [checklist, setChecklist] = useState({ passport: true, photo: true, insurance: false, bankStatement: true });

  const saveStatus = () => {
    const validationError = validateVisaTransition(status, rejectionReason, visaValidUntil);
    setError(validationError);
    if (!validationError) {
      setError("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Visa Case {id}</h1>
          <p className="text-sm text-gray-500">Manage visa status, documents, and readiness checklist.</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SurfaceCard className="xl:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Status Transition</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">Status</label>
              <select className="field-input" value={status} onChange={(event) => setStatus(event.target.value as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED")}>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            {status === "APPROVED" ? <DateInput label="Visa Valid Until" value={visaValidUntil} onChange={setVisaValidUntil} required /> : null}
            {status === "REJECTED" ? <TextInput label="Rejection Reason" value={rejectionReason} onChange={setRejectionReason} required /> : null}
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button onClick={saveStatus} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Status</button>

          <h2 className="pt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Checklist</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {Object.entries(checklist).map(([key, value]) => (
              <label key={key} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                <input type="checkbox" checked={value} onChange={() => setChecklist((current) => ({ ...current, [key]: !current[key as keyof typeof current] }))} />
                {key}
              </label>
            ))}
          </div>

          <Timeline
            items={[
              { id: "1", title: "Case created", meta: "Visa Executive", time: "2026-03-10 09:20", icon: <FaPassport /> },
              { id: "2", title: "Documents verified", meta: "Manager", time: "2026-03-11 04:15", icon: <FaListCheck /> },
            ]}
          />
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">Case Summary</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Country: Maldives</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Visa Type: Tourist</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Appointment: 2026-03-16</p>
          </SurfaceCard>
          <AuditMeta createdBy="Alex Morgan" createdAt="2026-03-10" updatedBy="Visa Team" updatedAt="2026-03-11" />
        </div>
      </div>
    </div>
  );
};

export default VisaDetailPage;
