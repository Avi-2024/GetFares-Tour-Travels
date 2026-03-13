import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";

const PermissionGate = ({ permission, children }: { permission: string; children: ReactNode }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return null;
  return <>{children}</>;
};

export default PermissionGate;
