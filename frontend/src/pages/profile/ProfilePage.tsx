import { useMemo, useState } from "react";
import {
  FaEdit,
  FaSave,
  FaTimes,
  FaCamera,
  FaCheckCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

const getDisplayName = (profile: any) => {
  return (profile?.name || "User").trim() || "User";
};

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const ProfilePage = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    photo: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "info";
  }>({ show: false, message: "", type: "success" });

  const displayName = useMemo(() => getDisplayName(profile), [profile]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const showToast = (message: string, type: "success" | "info") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      2400,
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return;

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev: any) => ({ ...prev, photo: reader.result }));
      showToast("Profile picture updated", "info");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setIsEditing(false);
    showToast("Profile updated successfully", "success");
  };

  return (
    <div className="space-y-6 px-0 max-w-9xl mx-auto relative">
      {toast.show && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border whitespace-nowrap ${
              toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-800 dark:!bg-transparent dark:border-emerald-400/40 dark:text-emerald-200 dark:shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                : "bg-blue-50 border-blue-200 text-blue-800 dark:!bg-transparent dark:border-sky-400/40 dark:text-sky-200 dark:shadow-[0_0_20px_rgba(14,165,233,0.35)]"
            }`}
          >
            {toast.type === "success" ? (
              <FaCheckCircle className="text-green-600 dark:text-emerald-300" />
            ) : (
              <FaInfoCircle className="text-blue-600 dark:text-sky-300" />
            )}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Profile
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your account details
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex justify-between items-center dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile.photo ? (
              <img
                src={profile.photo}
                className="h-16 w-16 rounded-2xl object-cover border border-gray-200 dark:border-gray-800"
              />
            ) : (
              <div className="h-16 w-16 flex items-center justify-center bg-blue-600 text-white rounded-2xl">
                {initials}
              </div>
            )}

            <label
              className={`absolute bottom-0 right-0 p-1 rounded-full transition ${
                isEditing
                  ? "bg-gray-900 text-white cursor-pointer hover:scale-110 dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              <FaCamera size={24} />
              <input
                type="file"
                hidden
                disabled={!isEditing}
                onChange={handlePhotoUpload}
              />
            </label>
          </div>

          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {displayName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {profile.email}
            </p>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <FaEdit /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
              <FaSave /> Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              <FaTimes /> Cancel
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          Account Details
        </h2>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Full Name</label>
            <input
              className="field-input"
              value={profile.name}
              disabled={!isEditing}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>

          <div>
            <label className="field-label">Phone Number</label>
            <input
              className="field-input"
              value={profile.phone}
              disabled={!isEditing}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
            />
          </div>

          <div>
            <label className="field-label">Email</label>
            <input className="field-input" value={profile.email} disabled />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
