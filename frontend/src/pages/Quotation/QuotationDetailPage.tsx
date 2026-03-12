import React from "react";
import { useParams } from "react-router-dom";

/**
 * Quotation detail placeholder that aligns with spec:
 * - supports lifecycle (view/update/send/approve/reject)
 * - shows versions, send logs, views, pricing summary
 */
const QuotationDetailPage: React.FC = () => {
  const { id } = useParams();

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Quotation ID</p>
            <h1 className="text-2xl font-bold text-gray-900">#{id}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Lead, template, margin %, discount, tax, currencies
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary">Save</button>
            <button className="btn-secondary">Generate PDF</button>
            <button className="btn-secondary">Send</button>
            <button className="btn-secondary">Approve Margin</button>
            <button className="btn-primary">Change Status</button>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-xl shadow p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Components</h2>
              <button className="btn-secondary text-sm">Add Item</button>
            </div>
            <div className="border rounded-lg p-3 text-sm text-gray-600">
              Grid for itemized costs (type, description, cost)
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <h3 className="text-lg font-semibold">Pricing Summary</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Total Cost</li>
              <li>Margin %</li>
              <li>Discount</li>
              <li>Tax</li>
              <li>Final</li>
            </ul>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4 space-y-2">
            <h3 className="text-lg font-semibold">Finance</h3>
            <p className="text-sm text-gray-600">
              Supplier cost, service fee, GST, TCS, client/supplier currencies.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 space-y-2">
            <h3 className="text-lg font-semibold">Versions</h3>
            <p className="text-sm text-gray-600">List of versions with view.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 space-y-2">
            <h3 className="text-lg font-semibold">Send Logs & Views</h3>
            <p className="text-sm text-gray-600">
              Track sends, public views, and view counts.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default QuotationDetailPage;
