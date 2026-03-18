import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import { TextInput, UUIDSelect } from "../../components/form";
import SurfaceCard from "../../components/ui/SurfaceCard";
import Timeline from "../../components/ui/Timeline";
import { complaintsApi } from "../../api/complaints";

const complaintsSeed = [
  {
    id: "cmp-1",
    bookingId: "BK-2034",
    issueType: "Hotel downgrade",
    description: "Client reported mismatch in room type.",
    status: "OPEN",
  },
  {
    id: "cmp-2",
    bookingId: "BK-2030",
    issueType: "Transfer delay",
    description: "Airport transfer reached late.",
    status: "IN_PROGRESS",
  },
];

const ComplaintsPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState(complaintsSeed);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bookingId: "",
    assignedTo: "",
    issueType: "",
    description: "",
    status: "OPEN",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch complaints on mount
  useEffect(() => {
    const fetchComplaints = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('No auth token found, using seed data');
        return;
      }

      try {
        setLoading(true);
        const response: any = await complaintsApi.list();
        if (response?.data && Array.isArray(response.data)) {
          setRows(response.data);
        } else if (Array.isArray(response)) {
          setRows(response);
        }
      } catch (err: any) {
        console.error('Failed to fetch complaints:', err);
        if (err?.status === 401) {
          setError('Authentication required. Please login to view complaints.');
        }
        // Keep using seed data on error
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  const createComplaint = async () => {
    if (!form.issueType.trim() || !form.description.trim()) {
      setError("issueType and description are required.");
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('Authentication required. Please login to create complaints.');
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const payload = {
        bookingId: form.bookingId || undefined,
        assignedTo: form.assignedTo || undefined,
        issueType: form.issueType,
        description: form.description,
        status: form.status,
      };

      const response: any = await complaintsApi.create(payload);
      const newComplaint = response?.data || response;
      
      // Add to local state
      if (newComplaint && newComplaint.id) {
        setRows((current) => [newComplaint, ...current]);
        setSuccess("Complaint created successfully!");
        
        // Reset form
        setForm({
          bookingId: "",
          assignedTo: "",
          issueType: "",
          description: "",
          status: "OPEN",
        });
      } else {
        // If no proper response, refetch the list
        const listResponse: any = await complaintsApi.list();
        if (listResponse?.data && Array.isArray(listResponse.data)) {
          setRows(listResponse.data);
        } else if (Array.isArray(listResponse)) {
          setRows(listResponse);
        }
        setSuccess("Complaint created successfully!");
        
        // Reset form anyway
        setForm({
          bookingId: "",
          assignedTo: "",
          issueType: "",
          description: "",
          status: "OPEN",
        });
      }
    } catch (err: any) {
      console.error('Failed to create complaint:', err);
      if (err?.status === 401) {
        setError('Authentication required. Please login to create complaints.');
      } else {
        setError(err?.message || "Failed to create complaint. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Complaints
        </h1>
        <p className="text-sm text-gray-500">
          Track post-sales complaints and activity trail.
        </p>
      </div>

      {!localStorage.getItem('auth_token') && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            ⚠️ You are viewing sample data. Please login to access real complaints data.
          </p>
        </div>
      )}

      <SurfaceCard>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Raise Complaint
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UUIDSelect
            label="Booking ID"
            value={form.bookingId}
            onChange={(value) =>
              setForm((current) => ({ ...current, bookingId: value }))
            }
            options={rows.map((row) => ({
              value: row.bookingId,
              label: row.bookingId,
            }))}
          />
          <TextInput
            label="Assigned To"
            value={form.assignedTo}
            onChange={(value) =>
              setForm((current) => ({ ...current, assignedTo: value }))
            }
          />
          <TextInput
            label="Issue Type"
            value={form.issueType}
            onChange={(value) =>
              setForm((current) => ({ ...current, issueType: value }))
            }
            required
            error={!form.issueType && error ? "Required" : ""}
          />
          <div>
            <label className="field-label">Status</label>
            <select
              className="field-input"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Description</label>
            <textarea
              className="field-input"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button onClick={() => setError("")} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 ml-2">
              ×
            </button>
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            <button onClick={() => setSuccess("")} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 ml-2">
              ×
            </button>
          </div>
        )}
        <button
          onClick={createComplaint}
          disabled={loading}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaPlus className="mr-2 inline" /> {loading ? 'Creating...' : 'Create Complaint'}
        </button>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SurfaceCard className="p-0 overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading complaints...</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500">No complaints found</p>
            </div>
          ) : (
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/95">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  ID
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Booking
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Issue
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/complaints/${row.id}`)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">
                    {row.id}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                    {row.bookingId}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                    {row.issueType}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Latest Activity
          </h2>
          <Timeline
            items={[
              {
                id: "act-1",
                title: "Complaint created",
                meta: "Operations",
                time: "Today, 10:10 AM",
                description: "Issue tagged and assigned to support queue.",
              },
              {
                id: "act-2",
                title: "Customer called",
                meta: "Support Agent",
                time: "Today, 11:30 AM",
                description:
                  "Explained resolution timeline and requested invoice copy.",
              },
            ]}
          />
        </SurfaceCard>
      </div>
    </div>
  );
};

export default ComplaintsPage;
