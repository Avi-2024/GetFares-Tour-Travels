import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PermissionRoute = ({ permission }: { permission?: string }) => {
  const { token, hasPermission } = useAuth();

  if (!token) return <Navigate to="/" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

export default PermissionRoute;
