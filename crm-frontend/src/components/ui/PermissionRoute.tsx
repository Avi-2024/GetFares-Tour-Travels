import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PermissionRoute = ({
  permission,
  roles,
}: {
  permission?: string;
  roles?: string[];
}) => {
  const {
    token,
    user,
    permissions,
    loadingPermissions,
    bootstrappingSession,
    hasPermission,
  } = useAuth();
  const location = useLocation();
  const normalizedRole = String(user?.role ?? "").toLowerCase();
  const isAdmin =
    normalizedRole === "admin" || normalizedRole === "super_admin";

  const getFallbackPath = () => {
    if (hasPermission("leads:read")) return "/leads";
    if (hasPermission("bookings:read")) return "/bookings";
    if (hasPermission("quotations:read")) return "/quotations";
    return "/profile";
  };

  if (bootstrappingSession) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
        Restoring session...
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  if (roles && !isAdmin && (!user?.role || !roles.includes(user.role))) {
    const fallbackPath = getFallbackPath();
    return <Navigate to={fallbackPath === location.pathname ? "/profile" : fallbackPath} replace />;
  }

  if (permission) {
    const bootstrappingPermissions =
      !isAdmin && loadingPermissions && permissions.length === 0;
    if (bootstrappingPermissions) {
      return (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
          Checking access...
        </div>
      );
    }

    if (!hasPermission(permission)) {
      const fallbackPath = getFallbackPath();
      return <Navigate to={fallbackPath === location.pathname ? "/profile" : fallbackPath} replace />;
    }
  }

  return <Outlet />;
};

export default PermissionRoute;
