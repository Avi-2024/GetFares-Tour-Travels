import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowRotateRight,
  FaCircleInfo,
  FaEnvelope,
  FaFloppyDisk,
  FaIdBadge,
  FaPenToSquare,
  FaShieldHalved,
  FaUser,
  FaXmark,
} from "react-icons/fa6";
import { getApiErrorMessage } from "../../api/apiClient";
import { authApi } from "../../api/auth";
import { usersApi } from "../../api/users";
import { useAuth } from "../../context/AuthContext";

type ProfileRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
};

type ProfileApiData = {
  id?: string;
  email?: string;
  fullName?: string;
  name?: string;
  role?: string;
  roleId?: string;
};

const mapProfileData = (
  profileData?: ProfileApiData | null,
): ProfileRecord | null => {
  if (!profileData) return null;
  const fallbackName = profileData.email?.split("@")[0] ?? "";
  return {
    id: profileData.id ?? "",
    name: profileData.fullName?.trim() || profileData.name?.trim() || fallbackName,
    email: profileData.email ?? "",
    role: profileData.role ?? "",
    roleId: profileData.roleId ?? "",
  };
};

const extractProfileRecord = (response: unknown): ProfileRecord | null => {
  const payload = (response as { data?: ProfileApiData })?.data ?? response;
  return mapProfileData(payload as ProfileApiData | null | undefined);
};

const getDisplayName = (profile: ProfileRecord | null) => {
  return (profile?.name || "User").trim() || "User";
};

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatRoleLabel = (role?: string) => {
  if (!role) return "Not assigned";
  return role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

const ProfilePage = () => {
  const { user, token, setAuthState, hasPermission } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [draft, setDraft] = useState({ name: "", email: "" });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const displayName = useMemo(() => getDisplayName(profile), [profile]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const roleLabel = formatRoleLabel(profile?.role);
  const emailLabel = profile?.email || "Not available";
  const roleIdLabel = profile?.roleId || "Not available";
  const userIdLabel = profile?.id || "Not available";
  const canEditProfile = Boolean(user?.id) && hasPermission("users:update");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      2400,
    );
  };

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError("");
    try {
      const response = await authApi.profile();
      const nextProfile = extractProfileRecord(response);
      if (!nextProfile) {
        setProfile(null);
        setProfileError("Profile data is missing from the API response.");
        return null;
      }
      setProfile(nextProfile);
      setDraft({
        name: nextProfile.name,
        email: nextProfile.email,
      });
      return nextProfile;
    } catch (err) {
      setProfile(null);
      setProfileError(getApiErrorMessage(err, "Failed to load profile."));
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const fields = [
    {
      label: "Full Name",
      value: isEditing ? draft.name : displayName,
      icon: <FaUser className="text-slate-400" />,
      editable: true,
      key: "name" as const,
    },
    {
      label: "Email",
      value: isEditing ? draft.email : emailLabel,
      icon: <FaEnvelope className="text-slate-400" />,
      editable: true,
      key: "email" as const,
    },
    {
      label: "Role",
      value: roleLabel,
      icon: <FaShieldHalved className="text-slate-400" />,
    },
    {
      label: "Role ID",
      value: roleIdLabel,
      icon: <FaIdBadge className="text-slate-400" />,
    },
    {
      label: "User ID",
      value: userIdLabel,
      icon: <FaIdBadge className="text-slate-400" />,
    },
  ];

  const handleCancel = () => {
    setDraft({
      name: profile?.name ?? "",
      email: profile?.email ?? "",
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!profile?.id) {
      showToast("Profile not loaded yet.", "error");
      return;
    }
    if (!canEditProfile) {
      showToast("You do not have permission to update this profile.", "error");
      return;
    }

    const nextName = draft.name.trim();
    const nextEmail = draft.email.trim();

    if (nextName.length < 2) {
      showToast("Full name must be at least 2 characters.", "error");
      return;
    }
    if (!isValidEmail(nextEmail)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    setSaving(true);
    try {
      const response = await usersApi.update(profile.id, {
        fullName: nextName,
        email: nextEmail,
      });

      const updatedProfile =
        extractProfileRecord(response) ?? (await fetchProfile()) ?? null;

      if (!updatedProfile) {
        throw new Error("Updated profile response is empty.");
      }

      setProfile(updatedProfile);
      setDraft({
        name: updatedProfile.name,
        email: updatedProfile.email,
      });
      setAuthState(token, {
        id: updatedProfile.id,
        name: updatedProfile.name,
        email: updatedProfile.email,
        role: updatedProfile.role,
        roleId: updatedProfile.roleId,
      });
      setIsEditing(false);
      showToast("Profile updated successfully.", "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Unable to update profile."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-9xl space-y-6 px-0">
      {toast.show ? (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-emerald-400/40 dark:bg-gray-900 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-gray-900 dark:text-red-200"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Account details loaded from the auth API
          </p>
        </div>

        <button
          onClick={() => void fetchProfile()}
          disabled={loadingProfile || saving}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <FaArrowRotateRight className={loadingProfile ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {profileError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200">
          {profileError}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-lg font-semibold text-white">
            {initials}
          </div>

          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {displayName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {emailLabel}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {roleLabel}
            </p>
            {loadingProfile ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Loading profile...
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FaCircleInfo />
            <span>
              {canEditProfile
                ? "Profile loads from /api/auth/me and saves through /api/users/:id."
                : "Profile loads from /api/auth/me."}
            </span>
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <FaXmark />
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaFloppyDisk />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              disabled={!canEditProfile || loadingProfile}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <FaPenToSquare />
              Edit
            </button>
          )}
        </div>

        <div className="mb-5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <FaCircleInfo />
          <span>
            {canEditProfile
              ? "You can edit your full name and email here."
              : "Profile editing requires users:update permission."}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.label}
              className={`rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950 ${
                field.label === "User ID" ? "md:col-span-2" : ""
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {field.icon}
                {field.label}
              </div>
              {isEditing && field.editable ? (
                <input
                  className="field-input"
                  value={field.value}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              ) : (
                <p className="break-all text-sm font-medium text-gray-900 dark:text-gray-100">
                  {field.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
