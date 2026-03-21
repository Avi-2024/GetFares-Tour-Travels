import React from "react";
import DestinationPricingManager from "../../components/settings/DestinationPricingManager";
import { useAuth } from "../../context/AuthContext";

const DestinationsPage: React.FC = () => {
  const { hasPermission } = useAuth();

  return (
    <div className="space-y-6">
      <DestinationPricingManager
        canReadSettings={hasPermission("settings:read")}
        canUpdateSettings={hasPermission("settings:update")}
      />
    </div>
  );
};

export default DestinationsPage;
