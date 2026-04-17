import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaPlus, FaUser, FaXmark } from "react-icons/fa6";
import { complaintsApi } from "../../api/complaints";
import { bookingsApi } from "../../api/bookings";
import { quotationsApi } from "../../api/quotations";
import { reportApiError } from "../../lib/notify";
import { useUsersService } from "../../hooks/useUsersService";
import { useLeadsService } from "../../hooks/useLeadsService";

interface Complaint {
  id: string;
  bookingId: string | null;
  assignedTo: string | null;
  issueType: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
}

interface Activity {
  id: string;
  note: string;
  userId: string;
  userName: string;
  createdAt: string;
  type: string;
}

type AssignableUser = {
  id: string;
  fullName?: string;
  email?: string;
  isActive?: boolean;
};

type BookingRecord = {
  id?: string;
  bookingNumber?: string;
  quotationId?: string;
  quotation_id?: string;
};

type QuotationRecord = {
  id?: string;
  leadId?: string;
  lead_id?: string;
};

type LeadRecord = {
  id?: string;
  fullName?: string;
  customerName?: string;
  name?: string;
  email?: string;
};

const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const usersService = useUsersService();
  const leadsService = useLeadsService();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [, setStatusHistory] = useState<any[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [assigneeUsers, setAssigneeUsers] = useState<AssignableUser[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [customerName, setCustomerName] = useState<string>("");
  const [bookingNumber, setBookingNumber] = useState<string>("");

  const [complaint, setComplaint] = useState<Complaint>({
    id: id || "CMP-001",
    bookingId: "BK-2034",
    assignedTo: "",
    issueType: "Hotel Downgrade",
    description:
      "Client reported mismatch in room type. Booked Deluxe Suite but received Standard Room at check-in.",
    status: "IN_PROGRESS",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T14:20:00Z",
    priority: "HIGH",
  });

  const [activities, setActivities] = useState<Activity[]>([
    {
      id: "act-1",
      note: "Complaint created and assigned to support queue.",
      userId: "user-1",
      userName: "System",
      createdAt: "2024-01-15T10:30:00Z",
      type: "NOTE",
    },
    {
      id: "act-2",
      note: "Assigned to Alex Thompson (Operations Team)",
      userId: "user-2",
      userName: "Manager",
      createdAt: "2024-01-15T11:15:00Z",
      type: "ASSIGNMENT",
    },
  ]);

  const getUserLabel = (userId: string | null | undefined) => {
    if (!userId) return "Unassigned";
    const user = assigneeUsers.find((item) => item.id === userId);
    if (!user) return userId;
    if (user.fullName && user.email) return `${user.fullName} (${user.email})`;
    return user.fullName || user.email || user.id;
  };

  useEffect(() => {
    const loadAssignableUsers = async () => {
      if (!localStorage.getItem("auth_token")) return;
      try {
        setLoadingAssignees(true);
        const response = await usersService.list();
        const rows = ((response as { data?: AssignableUser[] }).data ?? [])
          .filter((user) => user?.id)
          .filter((user) => user.isActive !== false);
        setAssigneeUsers(rows);
      } catch (err) {
        console.error("Failed to load users for assignment:", err);
      } finally {
        setLoadingAssignees(false);
      }
    };

    void loadAssignableUsers();
  }, [usersService]);

  useEffect(() => {
    const loadBookingCustomer = async () => {
      const bookingId = complaint.bookingId;
      if (!bookingId) {
        setCustomerName("");
        setBookingNumber("");
        return;
      }
      if (!localStorage.getItem("auth_token")) return;

      try {
        const bookingRes: any = await bookingsApi.getById(bookingId);
        const bookingPayload: BookingRecord = bookingRes?.data || bookingRes;
        const quoteId = bookingPayload?.quotationId || bookingPayload?.quotation_id;
        setBookingNumber(bookingPayload?.bookingNumber || "");

        if (!quoteId) {
          setCustomerName("");
          return;
        }

        const quotationRes: any = await quotationsApi.getById(String(quoteId));
        const quotationPayload: QuotationRecord =
          quotationRes?.data || quotationRes;
        const leadId = quotationPayload?.leadId || quotationPayload?.lead_id;
        if (!leadId) {
          setCustomerName("");
          return;
        }

        const leadRes: any = await leadsService.getLeadById(String(leadId));
        const leadPayload: LeadRecord = leadRes?.data || leadRes;
        const name =
          leadPayload?.fullName ||
          leadPayload?.customerName ||
          leadPayload?.name ||
          leadPayload?.email ||
          "";
        setCustomerName(name);
      } catch (err) {
        console.error("Failed to load booking customer for complaint:", err);
      }
    };

    void loadBookingCustomer();
  }, [complaint.bookingId, leadsService]);

  useEffect(() => {
    const loadComplaintData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError("");
        
        const [complaintRes, activitiesRes, statusHistoryRes] =
          await Promise.all([
            complaintsApi.getById(id),
            complaintsApi.listActivities(id).catch(() => ({ data: [] })),
            complaintsApi.getStatusHistory(id).catch(() => ({ data: [] })),
          ]);

        const complaintPayload = (complaintRes as any)?.data || complaintRes;
        if (complaintPayload) {
          const normalizedComplaint: Complaint = {
            ...(complaintPayload as Complaint),
            bookingId:
              (complaintPayload as Complaint).bookingId === undefined
                ? null
                : (complaintPayload as Complaint).bookingId,
            assignedTo:
              (complaintPayload as Complaint).assignedTo === undefined
                ? null
                : (complaintPayload as Complaint).assignedTo,
          };
          setComplaint(normalizedComplaint);
          setSelectedAssignee(normalizedComplaint.assignedTo || "");
        }
        
        if ((activitiesRes as any)?.data) {
          setActivities((activitiesRes as any).data);
        } else if (Array.isArray(activitiesRes)) {
          setActivities(activitiesRes as any);
        }
        
        if ((statusHistoryRes as any)?.data) {
          setStatusHistory((statusHistoryRes as any).data);
        } else if (Array.isArray(statusHistoryRes)) {
          setStatusHistory(statusHistoryRes as any);
        }
      } catch (error) {
        console.error("Failed to load complaint data:", error);
        reportApiError(
          error,
          "Failed to load complaint data. Using default data.",
          setError,
        );
        // Keep the seed data that's already set in state
      } finally {
        setLoading(false);
      }
    };

    loadComplaintData();
  }, [id]);

  useEffect(() => {
    setSelectedAssignee(complaint.assignedTo || "");
  }, [complaint.assignedTo]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900";
      case "RESOLVED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900";
      case "CLOSED":
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const getPriorityClass = (priority?: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900";
      case "LOW":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const handleStatusChange = async (
    newStatus: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  ) => {
    let reason = "";
    if (newStatus === "CLOSED" || newStatus === "RESOLVED") {
      reason =
        window.prompt(`Please provide a reason for marking as ${newStatus}:`) ||
        "";
      if (!reason.trim()) {
        setError("Reason is required for this status change");
        return;
      }
    }

    try {
      await complaintsApi.changeStatus(id!, newStatus, reason);

      setComplaint((prev) => ({
        ...prev,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      }));

      const newActivity: Activity = {
        id: `act-${Date.now()}`,
        note: `Status changed to ${newStatus}${reason ? `: ${reason}` : ""}`,
        userId: "current-user",
        userName: "Current User",
        createdAt: new Date().toISOString(),
        type: "STATUS_CHANGE",
      };
      setActivities((prev) => [newActivity, ...prev]);
      setError("");
    } catch (error) {
      console.error("Failed to update status:", error);
      reportApiError(error, "Failed to update complaint status", setError);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      setNoteError("Note cannot be empty");
      return;
    }

    try {
      await complaintsApi.addActivity(id!, {
        note: newNote,
        type: "NOTE",
      });

      const activity: Activity = {
        id: `act-${Date.now()}`,
        note: newNote,
        userId: "current-user",
        userName: "Current User",
        createdAt: new Date().toISOString(),
        type: "NOTE",
      };

      setActivities((prev) => [activity, ...prev]);
      setNewNote("");
      setNoteError("");
      setComplaint((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to add note:", error);
      reportApiError(error, "Failed to add note", setError);
    }
  };

  const handleAssignTo = async () => {
    if (!id) return;
    if (!selectedAssignee) {
      setError("Please select an assignee.");
      return;
    }

    setAssignmentLoading(true);
    try {
      await complaintsApi.assignTo(id, selectedAssignee);
      const selectedUserLabel = getUserLabel(selectedAssignee);

      setComplaint((prev) => ({
        ...prev,
        assignedTo: selectedAssignee,
        updatedAt: new Date().toISOString(),
      }));

      const newActivity: Activity = {
        id: `act-${Date.now()}`,
        note: `Complaint reassigned to ${selectedUserLabel}`,
        userId: "current-user",
        userName: "Current User",
        createdAt: new Date().toISOString(),
        type: "ASSIGNMENT",
      };
      setActivities((prev) => [newActivity, ...prev]);
      setError("");
    } catch (error) {
      console.error("Failed to assign complaint:", error);
      reportApiError(error, "Failed to assign complaint", setError);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleEscalate = async () => {
    const reason = window.prompt("Please provide escalation reason:");
    if (!reason?.trim()) {
      setError("Escalation reason is required");
      return;
    }

    try {
      await complaintsApi.escalate(id!, reason);

      const newActivity: Activity = {
        id: `act-${Date.now()}`,
        note: `Complaint escalated: ${reason}`,
        userId: "current-user",
        userName: "Current User",
        createdAt: new Date().toISOString(),
        type: "ESCALATION",
      };
      setActivities((prev) => [newActivity, ...prev]);
      setError("");
    } catch (error) {
      console.error("Failed to escalate complaint:", error);
      reportApiError(error, "Failed to escalate complaint", setError);
    }
  };

  const handleUpdateComplaint = async () => {
    try {
      await complaintsApi.update(id!, {
        bookingId: complaint.bookingId || undefined,
        assignedTo: complaint.assignedTo || null,
        issueType: complaint.issueType,
        description: complaint.description,
        status: complaint.status,
        priority: complaint.priority,
      });

      setIsEditing(false);
      setError("");
    } catch (error) {
      console.error("Failed to update complaint:", error);
      reportApiError(error, "Failed to update complaint", setError);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 ">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Complaint
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                #{complaint.id}
              </h1>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusClass(
                  complaint.status,
                )}`}
              >
                {complaint.status}
              </span>
              {complaint.priority && (
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getPriorityClass(
                    complaint.priority,
                  )}`}
                >
                  {complaint.priority} Priority
                </span>
              )}
            </div>
            {customerName ? (
              <div className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                {customerName}
                {bookingNumber ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    • {bookingNumber}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              <span>Created {formatDate(complaint.createdAt)}</span>
              <span>Updated {formatDate(complaint.updatedAt)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Edit Complaint
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateComplaint}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError("")}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <FaXmark />
            </button>
          </div>
        )}

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Complaint Details Card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Complaint Details
                </h2>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Booking ID
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={complaint.bookingId || ""}
                        onChange={(e) =>
                          setComplaint({
                            ...complaint,
                            bookingId: e.target.value || null,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                      />
                    ) : (
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {complaint.bookingId || "N/A"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Assigned To
                    </label>
                    {isEditing ? (
                      <select
                        value={complaint.assignedTo || ""}
                        onChange={(e) =>
                          setComplaint({
                            ...complaint,
                            assignedTo: e.target.value || null,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="">
                          {loadingAssignees ? "Loading users..." : "Unassigned"}
                        </option>
                        {assigneeUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName || user.email || user.id}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getUserLabel(complaint.assignedTo)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Issue Type <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={complaint.issueType}
                        onChange={(e) =>
                          setComplaint({
                            ...complaint,
                            issueType: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                        required
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {complaint.issueType}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Status
                    </label>
                    {isEditing ? (
                      <select
                        value={complaint.status}
                        onChange={(e) =>
                          setComplaint({
                            ...complaint,
                            status: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(
                          complaint.status,
                        )}`}
                      >
                        {complaint.status}
                      </span>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <textarea
                        value={complaint.description}
                        onChange={(e) =>
                          setComplaint({
                            ...complaint,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                        required
                      />
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        {complaint.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline Card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Activity Timeline
                </h2>
              </div>

              <div className="p-5">
                <div className="space-y-4 mb-6">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="border-l-2 border-blue-200 dark:border-blue-800 pl-4"
                    >
                      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {activity.userName}
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              • {activity.type.replace("_", " ")}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(activity.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {activity.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Note */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Add Note
                  </h3>
                  <textarea
                    value={newNote}
                    onChange={(e) => {
                      setNewNote(e.target.value);
                      setNoteError("");
                    }}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
                      noteError
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    placeholder="Enter a note..."
                  />
                  {noteError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {noteError}
                    </p>
                  )}
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleAddNote}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <FaPlus className="text-xs" /> Add Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Quick Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                  Quick Actions
                </h3>
              </div>
              <div className="p-5 space-y-2">
                <button
                  onClick={() => handleStatusChange("OPEN")}
                  disabled={complaint.status === "OPEN"}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    complaint.status === "OPEN"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 cursor-default"
                      : "bg-white dark:bg-gray-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  Mark as OPEN
                </button>

                <button
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  disabled={complaint.status === "IN_PROGRESS"}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    complaint.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 cursor-default"
                      : "bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  Mark as IN PROGRESS
                </button>

                <button
                  onClick={() => handleStatusChange("RESOLVED")}
                  disabled={complaint.status === "RESOLVED"}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    complaint.status === "RESOLVED"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cursor-default"
                      : "bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  Mark as RESOLVED
                </button>

                <button
                  onClick={() => handleStatusChange("CLOSED")}
                  disabled={complaint.status === "CLOSED"}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    complaint.status === "CLOSED"
                      ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 cursor-default"
                      : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  Mark as CLOSED
                </button>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
                  <select
                    value={selectedAssignee}
                    onChange={(event) => setSelectedAssignee(event.target.value)}
                    disabled={loadingAssignees}
                    className="w-full py-2 px-3 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 mb-2 disabled:opacity-60"
                  >
                    <option value="">
                      {loadingAssignees ? "Loading users..." : "Select assignee"}
                    </option>
                    {assigneeUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName || user.email || user.id}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignTo}
                    disabled={assignmentLoading || !selectedAssignee}
                    className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FaUser className="text-xs" />
                    {assignmentLoading ? "Assigning..." : "Reassign"}
                  </button>

                  <button
                    onClick={handleEscalate}
                    className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 flex items-center justify-center gap-2 mt-2"
                  >
                    <FaXmark className="text-xs" />
                    Escalate
                  </button>
                </div>
              </div>
            </div>

            {/* Related Booking */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                  Related Booking
                </h3>
              </div>
              <div className="p-5">
                {customerName ? (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Customer Name
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      {customerName}
                    </p>
                  </>
                ) : null}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Booking ID
                </p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">
                  {complaint.bookingId || "N/A"}
                </p>
                <button
                  onClick={() =>
                    complaint.bookingId && navigate(`/bookings/${complaint.bookingId}`)
                  }
                  disabled={!complaint.bookingId}
                  className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  View Booking Details
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                  Metadata
                </h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Created
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {formatDate(complaint.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Last Updated
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {formatDate(complaint.updatedAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Activities
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {activities.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailPage;
