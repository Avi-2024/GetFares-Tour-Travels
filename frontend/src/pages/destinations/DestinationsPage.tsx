import React from "react";
import DestinationPricingManager from "../../components/settings/DestinationPricingManager";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { useAuth } from "../../context/AuthContext";

const DestinationsPage: React.FC = () => {
  const { hasPermission } = useAuth();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Destinations & Pricing
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This page is useful for your CRM flow because destination data supports lead qualification, quotation costing, and destination-wise revenue reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SurfaceCard className="border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Lead Qualification
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              SOP me destination first qualification question hai. Is master data se consultants fast shortlist bana sakte hain.
            </p>
          </SurfaceCard>
          <SurfaceCard className="border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Quotation Costing
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Destination pricing quotation builder aur package costing ko consistent rakhta hai, especially hotel/visa/transfer planning ke liye.
            </p>
          </SurfaceCard>
          <SurfaceCard className="border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              KPI Reporting
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              PRD ke according destination-wise revenue tracking required hai, so ye page reporting data ka supporting master module hai.
            </p>
          </SurfaceCard>
        </div>
      </div>

      <DestinationPricingManager
        canReadSettings={hasPermission("settings:read")}
        canUpdateSettings={hasPermission("settings:update")}
      />
    </div>
  );
};

export default DestinationsPage;
