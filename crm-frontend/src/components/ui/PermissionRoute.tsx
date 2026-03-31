import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PermissionRoute = ({
  permission,
  roles,
}: {
  permission?: string;
  roles?: string[];
}) => {
  const { token, user, hasPermission } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";

  if (!token) return <Navigate to="/login" replace />;
  if (roles && !isAdmin && (!user?.role || !roles.includes(user.role)))
    return <Navigate to="/dashboard" replace />;
  if (permission && !hasPermission(permission))
    return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

export default PermissionRoute;
