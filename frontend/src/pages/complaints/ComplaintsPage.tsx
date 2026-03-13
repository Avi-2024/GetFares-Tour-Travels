import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import { TextInput, UUIDSelect } from "../../components/form";
import SurfaceCard from "../../components/ui/SurfaceCard";
import Timeline from "../../components/ui/Timeline";

const complaintsSeed = [
  { id: "cmp-1", bookingId: "BK-2034", issueType: "Hotel downgrade", description: "Client reported mismatch in room type.", status: "OPEN" },
  { id: "cmp-2", bookingId: "BK-2030", issueType: "Transfer delay", description: "Airport transfer reached late.", status: "IN_PROGRESS" },
];

const ComplaintsPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState(complaintsSeed);
  const [form, setForm] = useState({ bookingId: "", assignedTo: "", issueType: "", description: "", status: "OPEN" });
  const [error, setError] = useState("");

  const createComplaint = () => {
    if (!form.issueType.trim() || !form.description.trim()) {
      setError("issueType and description are required.");
      return;
    }

    setRows((current) => [{ id: `cmp-${current.length + 1}`, bookingId: form.bookingId || "N/A", issueType: form.issueType, description: form.description, status: form.status }, ...current]);
    setForm({ bookingId: "", assignedTo: "", issueType: "", description: "", status: "OPEN" });
    setError("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Complaints</h1>
        <p className="text-sm text-gray-500">Track post-sales complaints and activity trail.</p>
      </div>

      <SurfaceCard>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Raise Complaint</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UUIDSelect label="Booking ID" value={form.bookingId} onChange={(value) => setForm((current) => ({ ...current, bookingId: value }))} options={rows.map((row) => ({ value: row.bookingId, label: row.bookingId }))} />
          <TextInput label="Assigned To" value={form.assignedTo} onChange={(value) => setForm((current) => ({ ...current, assignedTo: value }))} />
          <TextInput label="Issue Type" value={form.issueType} onChange={(value) => setForm((current) => ({ ...current, issueType: value }))} required error={!form.issueType && error ? "Required" : ""} />
          <div>
            <label className="field-label">Status</label>
            <select className="field-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Description</label>
            <textarea className="field-input" rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
        <button onClick={createComplaint} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <FaPlus className="mr-2 inline" /> Create Complaint
        </button>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SurfaceCard className="p-0 overflow-hidden">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/95">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Booking</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Issue</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/complaints/${row.id}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">{row.id}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.bookingId}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.issueType}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Latest Activity</h2>
          <Timeline
            items={[
              { id: "act-1", title: "Complaint created", meta: "Operations", time: "Today, 10:10 AM", description: "Issue tagged and assigned to support queue." },
              { id: "act-2", title: "Customer called", meta: "Support Agent", time: "Today, 11:30 AM", description: "Explained resolution timeline and requested invoice copy." },
            ]}
          />
        </SurfaceCard>
      </div>
    </div>
  );
};

export default ComplaintsPage;
