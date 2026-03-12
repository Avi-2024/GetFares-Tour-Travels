import React from "react";
import { useParams } from "react-router-dom";

const BookingDetailPage: React.FC = () => {
  const { id } = useParams();

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Booking</p>
            <h1 className="text-2xl font-bold text-gray-900">#{id}</h1>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary">Generate Invoice</button>
            <button className="btn-primary">Update Booking</button>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Booking Info</h2>
              <p className="text-sm text-gray-600">
                Travel start/end, total amount, cost amount, profit, currencies.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Invoice Panel</h2>
              <p className="text-sm text-gray-600">
                List invoices, statuses, and actions to generate new invoice.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">History</h2>
              <p className="text-sm text-gray-600">Timeline of booking status history.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Status Controls</h3>
              <div className="flex flex-col gap-2">
                <button className="btn-secondary">Pending</button>
                <button className="btn-secondary">Confirmed</button>
                <button className="btn-secondary">Cancelled</button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Cancellation requires reason.</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Payment Snapshot</h3>
              <p className="text-sm text-gray-600">
                Advance required/received and payment status.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default BookingDetailPage;
